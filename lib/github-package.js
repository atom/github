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
import FilePatchController from './controllers/file-patch-controller';
import GitController from './controllers/git-controller';

const defaultState = {
  resolutionProgress: {},
};

export default class GithubPackage {
  constructor(workspace, project, commandRegistry, notificationManager, config) {
    this.workspace = workspace;
    this.project = project;
    this.commandRegistry = commandRegistry;
    this.notificationManager = notificationManager;
    this.config = config;
    this.modelsByProjectPath = new Map();
    this.activeRepository = null;
    this.activeResolutionProgress = null;
    this.subscriptions = new CompositeDisposable();
    this.savedState = {};
  }

  async activate(state = {}) {
    this.savedState = {...state, ...defaultState};

    this.subscriptions = new CompositeDisposable();
    const projectPaths = this.project.getDirectories().map(dir => dir.getRealPathSync());
    const initPromises = this.cacheModelsForPaths(projectPaths);
    this.initWatchersStartedPromise = initPromises.changeObserversStartedPromise;
    this.initModelsPromise = initPromises.modelsPromise;

    this.subscriptions.add(
      this.project.onDidChangePaths(this.didChangeProjectPaths),
      this.workspace.onDidChangeActivePaneItem(this.didChangeActivePaneItem),
      this.config.onDidChange('github.githubEnabled', this.rerender),
    );
    if (state.activeRepositoryPath) {
      const repository = await this.getRepositoryForWorkdirPath(state.activeRepositoryPath);
      if (repository) { this.setActiveModels(repository); }
    } else {
      this.updateActiveModels();
    }
    this.rerender();
  }

  serialize() {
    const activeRepository = this.getActiveRepository();
    return {
      activeRepositoryPath: activeRepository ? activeRepository.getWorkingDirectoryPath() : null,
      gitController: this.controller.serialize(),
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
      <GitController
        ref={c => { this.controller = c; }}
        workspace={this.workspace}
        commandRegistry={this.commandRegistry}
        notificationManager={this.notificationManager}
        repository={this.getActiveRepository()}
        resolutionProgress={this.getActiveResolutionProgress()}
        statusBar={this.statusBar}
        savedState={this.savedState.gitController}
        githubEnabled={this.config.get('github.githubEnabled')}
      />, this.element,
    );
  }

  async deactivate() {
    this.subscriptions.dispose();
    if (this.destroyedRepositorySubscription) { this.destroyedRepositorySubscription.dispose(); }
    await this.destroyModelsForPaths(Array.from(this.modelsByProjectPath.keys()));
  }

  consumeStatusBar(statusBar) {
    this.statusBar = statusBar;
    this.rerender();
  }

  @autobind
  async didChangeProjectPaths(projectPaths) {
    this.updateActiveModels();
    const previousProjectPaths = Array.from(this.modelsByProjectPath.keys());
    const {added, removed} = compareSets(new Set(previousProjectPaths), new Set(projectPaths));
    this.cacheModelsForPaths(Array.from(added));
    await this.destroyModelsForPaths(Array.from(removed));
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

  getActiveRepository() {
    return this.activeRepository;
  }

  getActiveResolutionProgress() {
    return this.activeResolutionProgress;
  }

  async updateActiveModels() {
    let nextActiveRepository, nextActiveResolutionProgress;

    const activeItem = this.workspace.getActivePaneItem();
    if (activeItem && typeof activeItem.getPath === 'function') {
      const projectPath = this.projectPathForItemPath(activeItem.getPath());
      if (projectPath) {
        await Promise.all([
          this.getRepositoryForWorkdirPath(projectPath).then(r => { nextActiveRepository = r; }),
          this.getResolutionProgressForWorkdirPath(projectPath).then(rp => { nextActiveResolutionProgress = rp; }),
        ]);
      }
    } else {
      nextActiveRepository = this.activeRepository;
      nextActiveResolutionProgress = this.activeResolutionProgress;
    }

    if (activeItem instanceof FilePatchController) {
      if (!activeItem.props.repository.isDestroyed()) {
        nextActiveRepository = activeItem.props.repository;
        nextActiveResolutionProgress = activeItem.props.resolutionProgress;
      }
    }

    if (!activeItem && this.project.getPaths().length === 1) {
      nextActiveRepository = await this.getRepositoryForWorkdirPath(this.project.getPaths()[0]);
    }

    if (nextActiveRepository && nextActiveRepository !== this.activeRepository) {
      this.setActiveModels(nextActiveRepository, nextActiveResolutionProgress);

      if (this.destroyedRepositorySubscription) { this.destroyedRepositorySubscription.dispose(); }
      this.destroyedRepositorySubscription = nextActiveRepository.onDidDestroy(() => {
        if (nextActiveRepository === this.activeRepository) {
          this.setActiveModels(null);
        }
        this.destroyedRepositorySubscription.dispose();
      });
    }

    if (!nextActiveRepository) {
      this.setActiveModels(null, null);
    }
  }

  setActiveModels(repository, resolutionProgress) {
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
    const models = this.modelsByProjectPath.get(workdirPath);
    return models ? models.repositoryPromise : Promise.resolve(null);
  }

  getResolutionProgressForWorkdirPath(workdirPath) {
    const models = this.modelsByProjectPath.get(workdirPath);
    return models ? models.resolutionProgressPromise : Promise.resolve(null);
  }

  getChangeObserverForWorkdirPath(workdirPath) {
    const models = this.modelsByProjectPath.get(workdirPath);
    return models ? models.changeObserverPromise : Promise.resolve(null);
  }

  cacheModelsForPaths(addedPaths) {
    const changeObserverPromises = [];
    const modelsPromises = [];

    const ready = Promise.all(addedPaths.map(async projectPath => {
      // TODO Since we need to await the repositoryPromise to see if a promise is available or not anyway, other
      // calls that are initialized with the promise aren't actually necessary anymore.
      const repositoryPromise = Repository.open(projectPath);
      const repository = await repositoryPromise;
      if (!repository) {
        return;
      }

      const changeObserver = process.platform === 'linux'
        ? new WorkspaceChangeObserver(window, this.workspace, repositoryPromise)
        : new FileSystemChangeObserver(repositoryPromise);
      this.subscriptions.add(
        changeObserver.onDidChange(() => repository.refresh()),
        changeObserver.onDidChangeWorkdirOrHead(() => this.refreshAtomGitRepository(repository)),
      );
      const changeObserverPromise = changeObserver.start();
      changeObserverPromises.push(changeObserverPromise);

      const savedResolutionProgress = this.savedState.resolutionProgress[projectPath] || {};
      const resolutionProgressPromise = repository.getLastCommit()
        .then(commit => new ResolutionProgress(commit.sha, savedResolutionProgress));

      // Technically this should wait on repositoryPromise too, but we know for a fact that it's already
      // resolved.
      modelsPromises.push(resolutionProgressPromise);

      this.modelsByProjectPath.set(projectPath, {
        repositoryPromise,
        changeObserverPromise,
        resolutionProgressPromise,
      });
    }));

    return {
      changeObserversStartedPromise: ready.then(() => Promise.all(changeObserverPromises)),
      modelsPromise: ready.then(() => Promise.all(modelsPromises)),
    };
  }

  destroyModelsForPaths(removedPaths) {
    return Promise.all(
      removedPaths.map(async projectPath => {
        const repositoryPromise = this.getRepositoryForWorkdirPath(projectPath);
        const changeObserverPromise = this.getChangeObserverForWorkdirPath(projectPath);
        this.modelsByProjectPath.delete(projectPath);

        const repository = await repositoryPromise;
        const changeObserver = await changeObserverPromise;
        // repository and changeObserver may be null if the associated workdir was not a Git repo
        repository && repository.destroy();
        changeObserver && await changeObserver.destroy();
      }),
    );
  }
}
