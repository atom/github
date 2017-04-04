import {CompositeDisposable, Disposable, File} from 'atom';

import path from 'path';

import React from 'react';
import ReactDom from 'react-dom';
import {autobind} from 'core-decorators';
import compareSets from 'compare-sets';

import Repository from './models/repository';
import FileSystemChangeObserver from './models/file-system-change-observer';
import WorkspaceChangeObserver from './models/workspace-change-observer';
import ResolutionProgress from './models/conflicts/resolution-progress';
import StyleCalculator from './models/style-calculator';
import FilePatchController from './controllers/file-patch-controller';
import RootController from './controllers/root-controller';
import IssueishPaneItem from './atom-items/issueish-pane-item';
import Switchboard from './switchboard';
import yardstick from './yardstick';
import GitTimingsView from './views/git-timings-view';

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
    this.modelPromisesByProjectPath = new Map();
    this.modelsByProjectPath = new Map();
    this.confirm = confirm;
    this.activeRepository = null;
    this.activeResolutionProgress = null;

    this.subscriptions = new CompositeDisposable();
    this.savedState = {};

    this.switchboard = new Switchboard();
    this.setupYardstick();
  }

  setupYardstick() {
    this.subscriptions.add(
      this.switchboard.onDidBeginStageOperation(payload => {
        if (payload.stage && payload.line) {
          yardstick.begin('stageLine');
        }
      }),
      this.switchboard.onDidUpdateRepository(() => {
        yardstick.mark('stageLine', 'update-repository');
      }),
      this.switchboard.onDidFinishRender(() => {
        yardstick.mark('stageLine', 'finish-render');
      }),
    );
  }

  activate(state = {}) {
    this.savedState = {...defaultState, ...state};

    this.subscriptions = new CompositeDisposable();
    const projectPaths = this.project.getDirectories().map(dir => dir.getRealPathSync());
    const initPromises = this.cacheModelsForPaths(projectPaths);
    this.initWatchersStartedPromise = initPromises.changeObserversStartedPromise;
    this.initModelsPromise = initPromises.modelsPromise;

    this.subscriptions.add(
      this.project.onDidChangePaths(this.didChangeProjectPaths),
      this.workspace.onDidChangeActivePaneItem(this.didChangeActivePaneItem),
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

    this.deserialize(this.savedState);

    this.rerender();
  }

  serialize() {
    const activeRepository = this.getActiveRepository();

    const resolutionProgressByPath = {};
    this.modelsByProjectPath.forEach((models, projectPath) => {
      const resolutionProgress = models.resolutionProgress;
      if (!resolutionProgress.isEmpty()) {
        resolutionProgressByPath[projectPath] = resolutionProgress.serialize();
      }
    });

    return {
      activeRepositoryPath: activeRepository ? activeRepository.getWorkingDirectoryPath() : null,
      gitController: this.controller.serialize(),
      resolutionProgressByPath,
    };
  }

  async deserialize(state) {
    // Ensure that Repository promises are available
    await this.initModelsPromise;
    let nextActiveRepository, nextActiveResolutionProgress;

    if (state.activeRepositoryPath) {
      const repository = await this.getRepositoryForWorkdirPath(state.activeRepositoryPath);
      if (repository) { nextActiveRepository = repository; }
    }

    if (nextActiveRepository) {
      const savedResolutionProgress = this.savedState.resolutionProgressByPath[state.activeRepositoryPath] || {};
      const commit = await nextActiveRepository.getLastCommit();
      nextActiveResolutionProgress = new ResolutionProgress(commit.sha, savedResolutionProgress);

      this.setActiveModels(nextActiveRepository, nextActiveResolutionProgress);
    } else {
      await this.updateActiveModels();
    }
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
    if (this.destroyedRepositorySubscription) { this.destroyedRepositorySubscription.dispose(); }
    await this.destroyModelsForPaths(Array.from(this.modelPromisesByProjectPath.keys()));
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
  async didChangeProjectPaths(projectPaths) {
    this.updateActiveModels();
    const previousProjectPaths = Array.from(this.modelPromisesByProjectPath.keys());
    const {added, removed} = compareSets(new Set(previousProjectPaths), new Set(projectPaths));
    this.cacheModelsForPaths(Array.from(added));
    await this.destroyModelsForPaths(Array.from(removed));
  }

  @autobind
  async createRepositoryForProjectPath(projectPath) {
    if (!projectPath) {
      throw new Error('Must specify a project path to create a repository for');
    }
    const repository = await Repository.init(projectPath);
    this.addRepository(repository);
    await this.updateActiveModels();
  }

  @autobind
  async cloneRepositoryForProjectPath(remoteUrl, projectPath) {
    const repository = await Repository.clone(remoteUrl, projectPath);
    this.addRepository(repository);
    this.project.addPath(projectPath);
    await this.updateActiveModels();
  }

  @autobind
  didChangeActivePaneItem() {
    this.updateActiveModels();
  }

  getInitialWatchersStartedPromise() {
    return this.initWatchersStartedPromise;
  }

  getInitialModelsPromise() {
    return this.initModelsPromise;
  }

  getActiveProjectPath() {
    return this.activeProjectPath;
  }

  getActiveRepository() {
    return this.activeRepository;
  }

  getActiveResolutionProgress() {
    return this.activeResolutionProgress;
  }

  async updateActiveModels() {
    await this.initModelsPromise;
    let nextActiveRepository, nextActiveResolutionProgress, nextActiveProjectPath;

    const activeItem = this.workspace.getActivePaneItem();
    if (activeItem && typeof activeItem.getPath === 'function') {
      const projectPath = this.projectPathForItemPath(activeItem.getPath());
      if (projectPath) {
        nextActiveProjectPath = projectPath;
        await Promise.all([
          this.getRepositoryForWorkdirPath(projectPath).then(r => { nextActiveRepository = r; }),
          this.getResolutionProgressForWorkdirPath(projectPath).then(rp => { nextActiveResolutionProgress = rp; }),
        ]);
      }
    } else {
      nextActiveRepository = this.activeRepository;
      nextActiveResolutionProgress = this.activeResolutionProgress;
      nextActiveProjectPath = this.activeProjectPath;
    }

    if (activeItem instanceof FilePatchController) {
      if (!activeItem.getRepository().isDestroyed()) {
        nextActiveRepository = activeItem.props.repository;
        nextActiveResolutionProgress = activeItem.props.resolutionProgress;
        nextActiveProjectPath = nextActiveRepository.getWorkingDirectoryPath();
      }
    }

    if (!activeItem && this.project.getPaths().length === 1) {
      nextActiveProjectPath = this.project.getPaths()[0];
      nextActiveRepository = await this.getRepositoryForWorkdirPath(nextActiveProjectPath);
    }

    if (nextActiveRepository && nextActiveRepository !== this.activeRepository) {
      this.activeProjectPath = nextActiveProjectPath || null;
      this.setActiveModels(nextActiveRepository, nextActiveResolutionProgress);

      if (this.destroyedRepositorySubscription) { this.destroyedRepositorySubscription.dispose(); }
      this.destroyedRepositorySubscription = nextActiveRepository.onDidDestroy(() => {
        if (nextActiveRepository === this.activeRepository) {
          this.setActiveModels(null);
        }
        this.destroyedRepositorySubscription.dispose();
      });
    } else if (nextActiveRepository && this.activeProjectPath !== nextActiveProjectPath) {
      this.activeProjectPath = nextActiveProjectPath || null;
      this.rerender();
    } else if (!nextActiveRepository) {
      this.activeProjectPath = nextActiveProjectPath || null;
      this.setActiveModels(null, null);
    }
  }

  setActiveModels(repository, resolutionProgress) {
    if (this.activeRepository !== repository) {
      if (this.changedRepositorySubscription) { this.changedRepositorySubscription.dispose(); }
      this.changedRepositorySubscription = repository.onDidUpdate(() => {
        this.switchboard.didUpdateRepository();
      });
    }

    this.activeRepository = repository;
    this.activeResolutionProgress = resolutionProgress;
    this.rerender();
  }

  refreshAtomGitRepository(repository) {
    const repoPath = repository.getWorkingDirectoryPath();
    const atomGitRepo = this.project.getRepositories().find(repo => {
      return repo && path.normalize(repo.getWorkingDirectory()) === repoPath;
    });
    return atomGitRepo ? atomGitRepo.refreshStatus() : Promise.resolve();
  }

  projectPathForItemPath(filePath) {
    if (!filePath) { return null; }
    const realFilePath = new File(filePath).getRealPathSync();
    const directory = this.project.getDirectories().find(projectDir => {
      const fixedPath = projectDir.getRealPathSync() + path.sep;
      return realFilePath.startsWith(fixedPath);
    });
    return directory ? directory.getRealPathSync() : null;
  }

  getRepositoryForWorkdirPath(workdirPath) {
    const models = this.modelPromisesByProjectPath.get(workdirPath);
    return models ? models.repositoryPromise : Promise.resolve(null);
  }

  getResolutionProgressForWorkdirPath(workdirPath) {
    const models = this.modelPromisesByProjectPath.get(workdirPath);
    return models ? models.resolutionProgressPromise : Promise.resolve(null);
  }

  getChangeObserverForWorkdirPath(workdirPath) {
    const models = this.modelPromisesByProjectPath.get(workdirPath);
    return models ? models.changeObserverPromise : Promise.resolve(null);
  }

  cacheModelsForPaths(addedPaths) {
    const changeObserverPromises = [];
    const modelsPromises = [];

    const ready = Promise.all(addedPaths.map(async projectPath => {
      const repository = await Repository.open(projectPath);
      if (!repository) {
        return;
      }

      const {modelPromise, changeObserverPromise} = this.addRepository(repository);
      modelsPromises.push(modelPromise);
      changeObserverPromises.push(changeObserverPromise);
    }));

    return {
      changeObserversStartedPromise: ready.then(() => Promise.all(changeObserverPromises)),
      modelsPromise: ready.then(() => Promise.all(modelsPromises)),
    };
  }

  addRepository(repository) {
    const projectPath = repository.getWorkingDirectoryPath();
    repository.setPromptCallback(query => this.controller.promptForCredentials(query));

    // TODO Since we need to await the repositoryPromise to see if a promise is available or not anyway, other
    // calls that are initialized with the promise aren't actually necessary anymore.
    const repositoryPromise = Promise.resolve(repository);

    const changeObserver = process.platform === 'linux'
      ? new WorkspaceChangeObserver(window, this.workspace, repositoryPromise)
      : new FileSystemChangeObserver(repositoryPromise);
    this.subscriptions.add(
      changeObserver.onDidChange(() => repository.refresh()),
      changeObserver.onDidChangeWorkdirOrHead(() => this.refreshAtomGitRepository(repository)),
    );
    const changeObserverPromise = changeObserver.start();

    const savedResolutionProgress = this.savedState.resolutionProgressByPath[projectPath] || {};
    const resolutionProgressPromise = repository.getLastCommit()
      .then(commit => new ResolutionProgress(commit.sha, savedResolutionProgress));

    // Once they resolve, stash the models in modelsByProjectPath for synchronous access when they're needed.
    const models = {
      repository,
      changeObserver: null,
      resolutionProgress: null,
    };
    this.modelsByProjectPath.set(projectPath, models);
    changeObserverPromise.then(() => {
      models.changeObserver = changeObserver;
    });
    resolutionProgressPromise.then(rp => {
      models.resolutionProgress = rp;
    });

    this.modelPromisesByProjectPath.set(projectPath, {
      repositoryPromise,
      changeObserverPromise,
      resolutionProgressPromise,
    });

    return {modelPromise: resolutionProgressPromise, changeObserverPromise};
  }

  destroyModelsForPaths(removedPaths) {
    return Promise.all(
      removedPaths.map(async projectPath => {
        const repositoryPromise = this.getRepositoryForWorkdirPath(projectPath);
        const changeObserverPromise = this.getChangeObserverForWorkdirPath(projectPath);
        this.modelPromisesByProjectPath.delete(projectPath);

        const repository = await repositoryPromise;
        const changeObserver = await changeObserverPromise;
        // repository and changeObserver may be null if the associated workdir was not a Git repo
        repository && repository.destroy();
        changeObserver && await changeObserver.destroy();
      }),
    );
  }
}
