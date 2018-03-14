import {CompositeDisposable, Disposable} from 'event-kit';

import path from 'path';
import fs from 'fs-extra';

import React from 'react';
import ReactDom from 'react-dom';
import {autobind} from 'core-decorators';

import {fileExists} from './helpers';
import WorkdirCache from './models/workdir-cache';
import WorkdirContext from './models/workdir-context';
import WorkdirContextPool from './models/workdir-context-pool';
import Repository from './models/repository';
import StyleCalculator from './models/style-calculator';
import RootController from './controllers/root-controller';
import IssueishPaneItem from './atom-items/issueish-pane-item';
import StubItem from './atom-items/stub-item';
import Switchboard from './switchboard';
import yardstick from './yardstick';
import GitTimingsView from './views/git-timings-view';
import ContextMenuInterceptor from './context-menu-interceptor';
import AsyncQueue from './async-queue';
import WorkerManager from './worker-manager';
import getRepoPipelineManager from './get-repo-pipeline-manager';

const defaultState = {
};

export default class GithubPackage {
  constructor(workspace, project, commandRegistry, notificationManager, tooltips, styles, grammars, confirm, config,
      deserializers, configDirPath, getLoadSettings) {

    this.workspace = workspace;
    this.project = project;
    this.commandRegistry = commandRegistry;
    this.deserializers = deserializers;
    this.notificationManager = notificationManager;
    this.tooltips = tooltips;
    this.config = config;
    this.styles = styles;
    this.grammars = grammars;
    this.configPath = path.join(configDirPath, 'github.cson');

    this.styleCalculator = new StyleCalculator(this.styles, this.config);
    this.confirm = confirm;
    this.startOpen = false;
    this.activated = false;

    const criteria = {
      projectPathCount: this.project.getPaths().length,
      initPathCount: (getLoadSettings().initialPaths || []).length,
    };

    this.pipelineManager = getRepoPipelineManager({confirm, notificationManager, workspace});

    this.activeContextQueue = new AsyncQueue();
    this.guessedContext = WorkdirContext.guess(criteria, this.pipelineManager);
    this.activeContext = this.guessedContext;
    this.workdirCache = new WorkdirCache();
    this.contextPool = new WorkdirContextPool({
      window,
      workspace,
      promptCallback: query => this.controller.promptForCredentials(query),
      pipelineManager: this.pipelineManager,
    });

    this.switchboard = new Switchboard();

    // Handle events from all resident contexts.
    this.subscriptions = new CompositeDisposable(
      this.contextPool.onDidChangeWorkdirOrHead(context => {
        this.refreshAtomGitRepository(context.getWorkingDirectory());
      }),
      this.contextPool.onDidUpdateRepository(context => {
        this.switchboard.didUpdateRepository(context.getRepository());
      }),
      this.contextPool.onDidDestroyRepository(context => {
        if (context === this.activeContext) {
          this.setActiveContext(WorkdirContext.absent({pipelineManager: this.pipelineManager}));
        }
      }),
      ContextMenuInterceptor,
    );

    this.setupYardstick();

    this.filePatchItems = [];
  }

  setupYardstick() {
    const stagingSeries = ['stageLine', 'stageHunk', 'unstageLine', 'unstageHunk'];

    this.subscriptions.add(
      // Staging and unstaging operations
      this.switchboard.onDidBeginStageOperation(payload => {
        if (payload.stage && payload.line) {
          yardstick.begin('stageLine');
        } else if (payload.stage && payload.hunk) {
          yardstick.begin('stageHunk');
        } else if (payload.stage && payload.file) {
          yardstick.begin('stageFile');
        } else if (payload.stage && payload.mode) {
          yardstick.begin('stageMode');
        } else if (payload.stage && payload.symlink) {
          yardstick.begin('stageSymlink');
        } else if (payload.unstage && payload.line) {
          yardstick.begin('unstageLine');
        } else if (payload.unstage && payload.hunk) {
          yardstick.begin('unstageHunk');
        } else if (payload.unstage && payload.file) {
          yardstick.begin('unstageFile');
        } else if (payload.unstage && payload.mode) {
          yardstick.begin('unstageMode');
        } else if (payload.unstage && payload.symlink) {
          yardstick.begin('unstageSymlink');
        }
      }),
      this.switchboard.onDidUpdateRepository(() => {
        yardstick.mark(stagingSeries, 'update-repository');
      }),
      this.switchboard.onDidFinishRender(context => {
        if (context === 'RootController.showFilePatchForPath') {
          yardstick.finish(stagingSeries);
        }
      }),

      // Active context changes
      this.switchboard.onDidScheduleActiveContextUpdate(() => {
        yardstick.begin('activeContextChange');
      }),
      this.switchboard.onDidBeginActiveContextUpdate(() => {
        yardstick.mark('activeContextChange', 'queue-wait');
      }),
      this.switchboard.onDidFinishContextChangeRender(() => {
        yardstick.mark('activeContextChange', 'render');
      }),
      this.switchboard.onDidFinishActiveContextUpdate(() => {
        yardstick.finish('activeContextChange');
      }),
    );
  }

  async activate(state = {}) {
    this.savedState = {...defaultState, ...state};

    const firstRun = !await fileExists(this.configPath);
    this.startOpen = firstRun && !this.config.get('welcome.showOnStartup');
    if (firstRun) {
      await fs.writeFile(this.configPath, '# Store non-visible GitHub package state.\n', {encoding: 'utf8'});
    }

    const hasSelectedFiles = event => {
      return !!event.target.closest('.github-FilePatchListView').querySelector('.is-selected');
    };

    this.subscriptions.add(
      this.project.onDidChangePaths(this.scheduleActiveContextUpdate),
      this.workspace.getCenter().onDidChangeActivePaneItem(this.scheduleActiveContextUpdate),
      this.styleCalculator.startWatching(
        'github-package-styles',
        ['editor.fontSize', 'editor.fontFamily', 'editor.lineHeight', 'editor.tabLength'],
        config => `
          .github-FilePatchView {
            font-size: 1.1em;
          }

          .github-HunkView-line {
            font-size: ${config.get('editor.fontSize')}px;
            font-family: ${config.get('editor.fontFamily')};
            line-height: ${config.get('editor.lineHeight')};
            tab-size: ${config.get('editor.tabLength')}
          }
        `,
      ),
      this.workspace.addOpener(uri => {
        if (uri === 'atom-github://debug/timings') {
          return this.createGitTimingsView();
        } else {
          return null;
        }
      }),
      this.workspace.addOpener(IssueishPaneItem.opener),
      this.workspace.addOpener((uri, ...args) => {
        if (uri.startsWith('atom-github://file-patch/')) {
          const item = this.createFilePatchControllerStub({uri});
          this.rerender();
          return item;
        } else {
          return null;
        }
      }),
      this.workspace.addOpener(uri => {
        if (uri.startsWith('atom-github://dock-item/')) {
          const item = this.createDockItemStub({uri});
          this.rerender();
          return item;
        } else {
          return null;
        }
      }),
      atom.contextMenu.add({
        '.github-UnstagedChanges .github-FilePatchListView': [
          {
            label: 'Stage',
            command: 'core:confirm',
            shouldDisplay: hasSelectedFiles,
          },
          {
            type: 'separator',
            shouldDisplay: hasSelectedFiles,
          },
          {
            label: 'Discard Changes',
            command: 'github:discard-changes-in-selected-files',
            shouldDisplay: hasSelectedFiles,
          },
        ],
        '.github-StagedChanges .github-FilePatchListView': [
          {
            label: 'Unstage',
            command: 'core:confirm',
            shouldDisplay: hasSelectedFiles,
          },
        ],
        '.github-MergeConflictPaths .github-FilePatchListView': [
          {
            label: 'Stage',
            command: 'core:confirm',
            shouldDisplay: hasSelectedFiles,
          },
          {
            type: 'separator',
            shouldDisplay: hasSelectedFiles,
          },
          {
            label: 'Resolve File As Ours',
            command: 'github:resolve-file-as-ours',
            shouldDisplay: hasSelectedFiles,
          },
          {
            label: 'Resolve File As Theirs',
            command: 'github:resolve-file-as-theirs',
            shouldDisplay: hasSelectedFiles,
          },
        ],
      }),
    );

    this.activated = true;
    this.scheduleActiveContextUpdate(this.savedState);
    this.rerender();
  }

  serialize() {
    const activeRepository = this.getActiveRepository();
    const activeRepositoryPath = activeRepository ? activeRepository.getWorkingDirectoryPath() : null;

    return {
      activeRepositoryPath,
      firstRun: false,
    };
  }

  rerender(callback) {
    if (this.workspace.isDestroyed()) {
      return;
    }

    if (!this.activated) {
      return;
    }

    if (!this.element) {
      this.element = document.createElement('div');
      this.subscriptions.add(new Disposable(() => {
        ReactDom.unmountComponentAtNode(this.element);
        delete this.element;
      }));
    }

    ReactDom.render(
      <RootController
        ref={c => { this.controller = c; }}
        workspace={this.workspace}
        deserializers={this.deserializers}
        commandRegistry={this.commandRegistry}
        notificationManager={this.notificationManager}
        tooltips={this.tooltips}
        grammars={this.grammars}
        config={this.config}
        project={this.project}
        confirm={this.confirm}
        repository={this.getActiveRepository()}
        resolutionProgress={this.getActiveResolutionProgress()}
        statusBar={this.statusBar}
        createRepositoryForProjectPath={this.createRepositoryForProjectPath}
        cloneRepositoryForProjectPath={this.cloneRepositoryForProjectPath}
        switchboard={this.switchboard}
        startOpen={this.startOpen}
        gitTabStubItem={this.gitTabStubItem}
        githubTabStubItem={this.githubTabStubItem}
        destroyGitTabItem={this.destroyGitTabItem}
        destroyGithubTabItem={this.destroyGithubTabItem}
        filePatchItems={this.filePatchItems}
        removeFilePatchItem={this.removeFilePatchItem}
        getRepositoryForWorkdir={this.getRepositoryForWorkdir}
      />, this.element, callback,
    );
  }

  async deactivate() {
    this.subscriptions.dispose();
    this.contextPool.clear();
    WorkerManager.reset(false);
    if (this.guessedContext) {
      this.guessedContext.destroy();
      this.guessedContext = null;
    }
    await yardstick.flush();
  }

  @autobind
  consumeStatusBar(statusBar) {
    this.statusBar = statusBar;
    this.rerender();
  }

  @autobind
  createGitTimingsView() {
    return GitTimingsView.createPaneItem();
  }

  @autobind
  createIssueishPaneItem({uri}) {
    return IssueishPaneItem.opener(uri);
  }

  @autobind
  createDockItemStub({uri}) {
    let item;
    switch (uri) {
      // always return an empty stub
      // but only set it as the active item for a tab type
      // if it doesn't already exist
      case 'atom-github://dock-item/git':
        item = this.createGitTabControllerStub(uri);
        this.gitTabStubItem = this.gitTabStubItem || item;
        break;
      case 'atom-github://dock-item/github':
        item = this.createGithubTabControllerStub(uri);
        this.githubTabStubItem = this.githubTabStubItem || item;
        break;
      default:
        throw new Error(`Invalid DockItem stub URI: ${uri}`);
    }

    if (this.controller) {
      this.rerender();
    }
    return item;
  }

  createGitTabControllerStub(uri) {
    return StubItem.create('git-tab-controller', {
      title: 'Git',
    }, uri);
  }

  createGithubTabControllerStub(uri) {
    return StubItem.create('github-tab-controller', {
      title: 'GitHub (preview)',
    }, uri);
  }

  @autobind
  createFilePatchControllerStub({uri} = {}) {
    const item = StubItem.create('git-file-patch-controller', {
      title: 'Diff',
    }, uri);
    this.filePatchItems.push(item);
    if (this.controller) {
      this.rerender();
    }
    return item;
  }

  @autobind
  destroyGitTabItem() {
    if (this.gitTabStubItem) {
      this.gitTabStubItem.destroy();
      this.gitTabStubItem = null;
      if (this.controller) {
        this.rerender();
      }
    }
  }

  @autobind
  destroyGithubTabItem() {
    if (this.githubTabStubItem) {
      this.githubTabStubItem.destroy();
      this.githubTabStubItem = null;
      if (this.controller) {
        this.rerender();
      }
    }
  }

  @autobind
  removeFilePatchItem(itemToRemove) {
    this.filePatchItems = this.filePatchItems.filter(item => item !== itemToRemove);
    if (this.controller) {
      this.rerender();
    }
  }

  @autobind
  async createRepositoryForProjectPath(projectPath) {
    await fs.mkdirs(projectPath);

    const repository = this.contextPool.add(projectPath).getRepository();
    await repository.init();
    this.workdirCache.invalidate();

    if (!this.project.contains(projectPath)) {
      this.project.addPath(projectPath);
    }

    await this.scheduleActiveContextUpdate();
  }

  @autobind
  async cloneRepositoryForProjectPath(remoteUrl, projectPath) {
    const context = this.contextPool.getContext(projectPath);
    let repository;
    if (context.isPresent()) {
      repository = context.getRepository();
      await repository.clone(remoteUrl);
      repository.destroy();
    } else {
      repository = new Repository(projectPath, null, {pipelineManager: this.pipelineManager});
      await repository.clone(remoteUrl);
    }

    this.workdirCache.invalidate();

    this.project.addPath(projectPath);

    await this.scheduleActiveContextUpdate();
  }

  @autobind
  getRepositoryForWorkdir(projectPath) {
    const loadingGuessRepo = Repository.loadingGuess({pipelineManager: this.pipelineManager});
    return this.guessedContext ? loadingGuessRepo : this.contextPool.getContext(projectPath).getRepository();
  }

  getActiveWorkdir() {
    return this.activeContext.getWorkingDirectory();
  }

  getActiveRepository() {
    return this.activeContext.getRepository();
  }

  getActiveResolutionProgress() {
    return this.activeContext.getResolutionProgress();
  }

  getContextPool() {
    return this.contextPool;
  }

  getSwitchboard() {
    return this.switchboard;
  }

  @autobind
  async scheduleActiveContextUpdate(savedState = {}) {
    this.switchboard.didScheduleActiveContextUpdate();
    await this.activeContextQueue.push(this.updateActiveContext.bind(this, savedState), {parallel: false});
  }

  /**
   * Derive the git working directory context that should be used for the package's git operations based on the current
   * state of the Atom workspace. In priority, this prefers:
   *
   * - A git working directory that contains the active pane item in the workspace's center.
   * - A git working directory corresponding to a single Project.
   * - When initially activating the package, the working directory that was active when the package was last
   *   serialized.
   * - The current context, unchanged, which may be a `NullWorkdirContext`.
   *
   * First updates the pool of resident contexts to match all git working directories that correspond to open
   * projects and pane items.
   */
  async getNextContext(savedState) {
    const workdirs = new Set(
      await Promise.all(
        this.project.getPaths().map(async projectPath => {
          const workdir = await this.workdirCache.find(projectPath);
          return workdir || projectPath;
        }),
      ),
    );

    const fromPaneItem = async maybeItem => {
      const itemPath = pathForPaneItem(maybeItem);

      if (!itemPath) {
        return {};
      }

      const itemWorkdir = await this.workdirCache.find(itemPath);

      if (itemWorkdir && !this.project.contains(itemPath)) {
        workdirs.add(itemWorkdir);
      }

      return {itemPath, itemWorkdir};
    };

    const active = await fromPaneItem(this.workspace.getCenter().getActivePaneItem());

    this.contextPool.set(workdirs, savedState);

    if (active.itemPath) {
      // Prefer an active item
      return this.contextPool.getContext(active.itemWorkdir || active.itemPath);
    }

    if (this.project.getPaths().length === 1) {
      // Single project
      const projectPath = this.project.getPaths()[0];
      const activeWorkingDir = await this.workdirCache.find(projectPath);
      return this.contextPool.getContext(activeWorkingDir || projectPath);
    }

    if (this.project.getPaths().length === 0 && !this.activeContext.getRepository().isUndetermined()) {
      // No projects. Revert to the absent context unless we've guessed that more projects are on the way.
      return WorkdirContext.absent({pipelineManager: this.pipelineManager});
    }

    // Restore models from saved state. Will return a NullWorkdirContext if this path is not presently
    // resident in the pool.
    const savedWorkingDir = savedState.activeRepositoryPath;
    if (savedWorkingDir) {
      return this.contextPool.getContext(savedWorkingDir);
    }

    return this.activeContext;
  }

  setActiveContext(nextActiveContext) {
    if (nextActiveContext !== this.activeContext) {
      if (this.activeContext === this.guessedContext) {
        this.guessedContext.destroy();
        this.guessedContext = null;
      }
      this.activeContext = nextActiveContext;
      this.rerender(() => {
        this.switchboard.didFinishContextChangeRender();
        this.switchboard.didFinishActiveContextUpdate();
      });
    } else {
      this.switchboard.didFinishActiveContextUpdate();
    }
  }

  async updateActiveContext(savedState = {}) {
    if (this.workspace.isDestroyed()) {
      return;
    }

    this.switchboard.didBeginActiveContextUpdate();

    const nextActiveContext = await this.getNextContext(savedState);
    this.setActiveContext(nextActiveContext);
  }

  refreshAtomGitRepository(workdir) {
    const atomGitRepo = this.project.getRepositories().find(repo => {
      return repo && path.normalize(repo.getWorkingDirectory()) === workdir;
    });
    return atomGitRepo ? atomGitRepo.refreshStatus() : Promise.resolve();
  }
}

function pathForPaneItem(paneItem) {
  if (!paneItem) {
    return null;
  }

  // Likely GitHub package provided pane item
  if (typeof paneItem.getWorkingDirectory === 'function') {
    return paneItem.getWorkingDirectory();
  }

  // TextEditor-like
  if (typeof paneItem.getPath === 'function') {
    return paneItem.getPath();
  }

  // Oh well
  return null;
}
