import {CompositeDisposable, Disposable} from 'event-kit';

import path from 'path';

import React from 'react';
import ReactDom from 'react-dom';
import {autobind} from 'core-decorators';

import {mkdirs, fileExists, writeFile} from './helpers';
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
import {getActionPipelineManager} from './action-pipeline';
import AsyncQueue from './async-queue';
import WorkerManager from './worker-manager';
import {GitError} from './git-shell-out-strategy';


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

    this.activeContextQueue = new AsyncQueue();
    this.guessedContext = WorkdirContext.guess(criteria);
    this.activeContext = this.guessedContext;
    this.workdirCache = new WorkdirCache();
    this.contextPool = new WorkdirContextPool({
      window,
      workspace,
      promptCallback: query => this.controller.promptForCredentials(query),
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
          this.setActiveContext(WorkdirContext.absent());
        }
      }),
      ContextMenuInterceptor,
    );

    this.setupYardstick();

    this.filePatchItems = [];

    this.pipelineManager = getActionPipelineManager();
    const pushPipeline = this.pipelineManager.getPipeline(this.pipelineManager.actionKeys.PUSH);
    pushPipeline.addMiddleware('confirm-force-push', (next, repository, branchName, options) => {
      if (options.force) {
        const choice = this.props.confirm({
          message: 'Are you sure you want to force push?',
          detailedMessage: 'This operation could result in losing data on the remote.',
          buttons: ['Force Push', 'Cancel Push'],
        });
        if (choice !== 0) { return null; } else { return next(); }
      } else {
        return next();
      }
    });
    pushPipeline.addMiddleware('set-push-in-progress', async (next, repository, branchName, options) => {
      repository.setOperationProgressState('push', true);
      await next();
      repository.setOperationProgressState('push', false);
    });
    pushPipeline.addMiddleware('failed-to-push-error', async (next, repository, branchName, options) => {
      try {
        const result = await next();
        return result;
      } catch (error) {
        if (!(error instanceof GitError)) { throw error; }
        if (/rejected[\s\S]*failed to push/.test(error.stdErr)) {
          this.notificationManager.addError('Push rejected', {
            description: 'The tip of your current branch is behind its remote counterpart.' +
              ' Try pulling before pushing again. Or, to force push, hold `cmd` or `ctrl` while clicking.',
            dismissable: true,
          });
        } else {
          console.error(error);
          this.notificationManager.addError('Unable to push', {
            description: `<pre>${error.stdErr}</pre>`,
            dismissable: true,
          });
        }
        return error;
      }
    });

    const pullPipeline = this.pipelineManager.getPipeline(this.pipelineManager.actionKeys.PULL);
    pullPipeline.addMiddleware('set-pull-in-progress', async (next, repository, branchName) => {
      repository.setOperationProgressState('pull', true);
      await next();
      repository.setOperationProgressState('pull', false);
    });
    pullPipeline.addMiddleware('failed-to-pull-error', async (next, repository, branchName) => {
      try {
        const result = await next();
        return result;
      } catch (error) {
        if (!(error instanceof GitError)) { throw error; }
        if (/error: Your local changes to the following files would be overwritten by merge/.test(error.stdErr)) {
          const lines = error.stdErr.split('\n');
          const files = lines.slice(3, lines.length - 3).map(l => `\`${l.trim()}\``).join('<br>');
          this.notificationManager.addError('Pull aborted', {
            description: 'Local changes to the following would be overwritten by merge:<br>' + files +
              '<br>Please commit your changes or stash them before you merge.',
            dismissable: true,
          });
        } else if (/Automatic merge failed; fix conflicts and then commit the result./.test(error.stdOut)) {
          this.controller.gitTabTracker.ensureVisible();
          this.notificationManager.addInfo('Merge conflicts', {
            description: `Your local changes conflicted with changes made on the remote branch. Resolve the conflicts
              with the Git panel and commit to continue.`,
            dismissable: true,
          });
        } else {
          console.error(error);
          this.notificationManager.addError('Unable to pull', {
            description: `<pre>${error.stdErr}</pre>`,
            dismissable: true,
          });
        }
        return error;
      }
    });

    const fetchPipeline = this.pipelineManager.getPipeline(this.pipelineManager.actionKeys.FETCH);
    fetchPipeline.addMiddleware('set-fetch-in-progress', async (next, repository) => {
      repository.setOperationProgressState('fetch', true);
      await next();
      repository.setOperationProgressState('fetch', false);
    });
    fetchPipeline.addMiddleware('failed-to-fetch-error', async (next, repository) => {
      try {
        const result = await next();
        return result;
      } catch (error) {
        if (!(error instanceof GitError)) { throw error; }
        console.error(error);
        this.notificationManager.addError('Unable to fetch', {
          description: `<pre>${error.stdErr}</pre>`,
          dismissable: true,
        });
        return error;
      }
    });

    const checkoutPipeline = this.pipelineManager.getPipeline(this.pipelineManager.actionKeys.CHECKOUT);
    checkoutPipeline.addMiddleware('set-checkout-in-progress', async (next, repository, branchName) => {
      repository.setOperationProgressState('checkout', branchName);
      await next();
      repository.setOperationProgressState('checkout', false);
    });
    checkoutPipeline.addMiddleware('failed-to-checkout-error', async (next, repository, branchName, options) => {
      try {
        const result = await next();
        return result;
      } catch (error) {
        if (!(error instanceof GitError)) { throw error; }
        const message = options.createNew ? 'Cannot create branch' : 'Checkout aborted';
        let description = `<pre>${error.stdErr}</pre>`;
        if (error.stdErr.match(/local changes.*would be overwritten/)) {
          const files = error.stdErr.split(/\r?\n/).filter(l => l.startsWith('\t'))
            .map(l => `\`${l.trim()}\``).join('<br>');
          description = 'Local changes to the following would be overwritten:<br>' + files +
            '<br>Please commit your changes or stash them.';
        } else if (error.stdErr.match(/branch.*already exists/)) {
          description = `\`${branchName}\` already exists. Choose another branch name.`;
        } else if (error.stdErr.match(/error: you need to resolve your current index first/)) {
          description = 'You must first resolve merge conflicts.';
        } else {
          console.error(error);
        }
        this.notificationManager.addError(message, {description, dismissable: true});
        return error;
      }
    });
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
        } else if (payload.unstage && payload.line) {
          yardstick.begin('unstageLine');
        } else if (payload.unstage && payload.hunk) {
          yardstick.begin('unstageHunk');
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
      await writeFile(this.configPath, '# Store non-visible GitHub package state.\n');
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
    WorkerManager.reset(true);
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
    await mkdirs(projectPath);

    const repository = this.contextPool.add(projectPath).getRepository();
    await repository.init();
    this.workdirCache.invalidate(projectPath);

    if (!this.project.contains(projectPath)) {
      this.project.addPath(projectPath);
    }

    await this.scheduleActiveContextUpdate();
  }

  @autobind
  async cloneRepositoryForProjectPath(remoteUrl, projectPath) {
    const context = this.contextPool.getContext(projectPath);
    const repository = context.isPresent() ? context.getRepository() : new Repository(projectPath);

    await repository.clone(remoteUrl);
    this.workdirCache.invalidate(projectPath);

    this.project.addPath(projectPath);

    await this.scheduleActiveContextUpdate();
  }

  @autobind
  getRepositoryForWorkdir(projectPath) {
    return this.guessedContext ? Repository.loadingGuess() : this.contextPool.getContext(projectPath).getRepository();
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
      return WorkdirContext.absent();
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
