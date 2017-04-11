import {CompositeDisposable, Disposable, File} from 'atom';

import path from 'path';

import React from 'react';
import ReactDom from 'react-dom';
import {autobind} from 'core-decorators';
import compareSets from 'compare-sets';

import WorkdirCache from './models/workdir-cache';
import {nullWorkdirContext} from './models/workdir-context';
import WorkdirContextPool from './models/workdir-context-pool';
import Repository from './models/repository';
import FileSystemChangeObserver from './models/file-system-change-observer';
import WorkspaceChangeObserver from './models/workspace-change-observer';
import ResolutionProgress from './models/conflicts/resolution-progress';
import StyleCalculator from './models/style-calculator';
import RootController from './controllers/root-controller';
import IssueishPaneItem from './atom-items/issueish-pane-item';
import Switchboard from './switchboard';
import yardstick from './yardstick';
import GitTimingsView from './views/git-timings-view';
import AsyncQueue from './async-queue';

const defaultState = {
  resolutionProgressByPath: {},
};

export default class GithubPackage {
  constructor(workspace, project, commandRegistry, notificationManager, tooltips, styles, config, confirm) {
    this.workspace = workspace;
    this.project = project;
    this.commandRegistry = commandRegistry;
    this.notificationManager = notificationManager;
    this.tooltips = tooltips;
    this.config = config;
    this.styles = styles;

    this.styleCalculator = new StyleCalculator(this.styles, this.config);
    this.confirm = confirm;

    this.activeContextQueue = new AsyncQueue();
    this.activeContext = nullWorkdirContext;
    this.workdirCache = new WorkdirCache();
    this.contextPool = new WorkdirContextPool({
      window,
      workspace,
      promptCallback: query => this.controller.promptForCredentials(query),
    });

    this.subscriptions = new CompositeDisposable();

    this.switchboard = new Switchboard();
    this.setupYardstick();
  }

  setupYardstick() {
    const stagingSeries = ['stageLine', 'stageHunk', 'unstageLine', 'unstageHunk'];

    this.subscriptions.add(
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
    );
  }

  activate(state = {}) {
    const savedState = {...defaultState, ...state};

    this.subscriptions.add(
      this.project.onDidChangePaths(this.scheduleActiveContextUpdate),
      this.workspace.onDidChangeActivePaneItem(this.scheduleActiveContextUpdate),
      this.styleCalculator.startWatching(
        'github-package-styles',
        ['editor.fontSize', 'editor.fontFamily', 'editor.lineHeight'],
        config => `
          .github-FilePatchView {
            font-size: 1.1em;
          }

          .github-HunkView-line {
            font-size: ${config.get('editor.fontSize')}px;
            font-family: ${config.get('editor.fontFamily')};
            line-height: ${config.get('editor.lineHeight')};
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
    );

    this.rerender();
  }

  serialize() {
    const activeRepository = this.getActiveRepository();
    const activeRepositoryPath = activeRepository ? activeRepository.getWorkingDirectoryPath() : null;

    const resolutionProgressByPath = {};
    this.activeContext.withResidentContexts((workdir, context) => {
      const resolutionProgress = context.getResolutionProgress();
      if (!resolutionProgress || resolutionProgress.isEmpty()) {
        return;
      }

      resolutionProgressByPath[workdir] = resolutionProgress.serialize();
    });

    return {
      activeRepositoryPath,
      gitController: this.controller.serialize(),
      resolutionProgressByPath,
    };
  }

  @autobind
  rerender() {
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
        commandRegistry={this.commandRegistry}
        notificationManager={this.notificationManager}
        tooltips={this.tooltips}
        config={this.config}
        confirm={this.confirm}
        activeProjectPath={this.activeProjectPath}
        repository={this.getActiveRepository()}
        resolutionProgress={this.getActiveResolutionProgress()}
        statusBar={this.statusBar}
        savedState={this.savedState.gitController}
        createRepositoryForProjectPath={this.createRepositoryForProjectPath}
        cloneRepositoryForProjectPath={this.cloneRepositoryForProjectPath}
        switchboard={this.switchboard}
      />, this.element,
    );
  }

  async deactivate() {
    this.subscriptions.dispose();

    this.destroyedRepositorySubscription && this.destroyedRepositorySubscription.dispose();
    this.changedRepositorySubscription && this.changedRepositorySubscription.dispose();

    this.contextPool.clear();

    await yardstick.flush();
  }

  consumeStatusBar(statusBar) {
    this.statusBar = statusBar;
    this.rerender();
  }

  createGitTimingsView() {
    return GitTimingsView.createPaneItem();
  }

  createIssueishPaneItem({uri}) {
    return IssueishPaneItem.opener(uri);
  }

  @autobind
  async createRepositoryForProjectPath(projectPath) {
    if (!projectPath) {
      throw new Error('Must specify a project path to create a repository for');
    }
    const repository = await Repository.init(projectPath);
    this.addRepository(repository);
    await this.scheduleActiveModelUpdate();
  }

  @autobind
  async cloneRepositoryForProjectPath(remoteUrl, projectPath) {
    const repository = await Repository.clone(remoteUrl, projectPath);
    this.addRepository(repository);
    this.project.addPath(projectPath);
    await this.scheduleActiveModelUpdate();
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

  @autobind
  async scheduleActiveContextUpdate(savedState = {}) {
    await this.activeContextQueue.push(this.updateActiveModels.bind(this, savedState), {parallel: false});
  }

  /**
   * Derive the git working directory context that should be used for the package's git operations based on the current
   * state of the Atom workspace. In priority, this prefers:
   *
   * - A git working directory that contains the active pane item.
   * - A git working directory corresponding to a single Project.
   * - When initially activating the package, the working directory that was active when the package was last
   *   serialized.
   * - The current context, unchanged, which may be a `NullWorkdirContext`.
   *
   * First updates the pool of resident contexts to match all git working directories that correspond to open
   * projects and pane items.
   */
  async getNextContext(savedState) {
    const candidates = new Set(this.project.getDirectories());

    this.workspace.getPaneItems()
      .map(pathForPaneItem)
      .filter(itemPath => !this.project.contains(itemPath))
      .forEach(itemPath => candidates.add(itemPath));

    const workdirs = await Promise.all(
      Array.from(candidates, candidate => this.workdirCache.find(candidate)),
    );

    this.contextPool.set(workdirs);

    const activeItemPath = pathForPaneItem(this.workspace.getActivePaneItem());
    if (activeItemPath) {
      // Prefer an active item if it has a git working directory.
      const activeWorkingDir = await this.workdirCache.find(activeItemPath);
      if (activeWorkingDir) { return this.contextPool.getContext(activeWorkingDir); }
    }

    if (this.project.getPaths().length === 1) {
      // Single project
      const activeWorkingDir = await this.workdirCache.find(this.project.getPaths()[0]);
      if (activeWorkingDir) { return this.contextPool.getContext(activeWorkingDir); }
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
      this.contextSubs.dispose();
      this.contextSubs = new CompositeDisposable();

      this.activeContext = nextActiveContext;

      this.activeContext.getRepositoryPromise().then(repository => {
        if (!repository || repository.isDestroyed()) {
          return;
        }

        this.contextSubs.add(repository.onDidUpdate(() => {
          this.switchboard.didUpdateRepository();
        }));
        this.contextSubs.add(repository.onDidDestroy(() => {
          if (repository === this.getActiveRepository()) {
            this.setActiveContext(nullWorkdirContext);
          }
          this.destroyedRepositorySubscription.dispose();
        }));
      });

      this.activeContext.getChangeObserverPromise().then(observer => {
        this.contextSubs.add(observer.onDidChangeWorkdirOrHead(() => {
          this.refreshAtomGitRepository(nextActiveContext.getWorkingDirectory());
        }));
      });

      this.rerender();
    }
  }

  async updateActiveContext(savedState = {}) {
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
