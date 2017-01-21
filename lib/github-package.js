import {CompositeDisposable, Disposable, File} from 'atom';

import path from 'path';

import React from 'react';
import ReactDom from 'react-dom';
import {Provider} from 'react-redux';
import {autobind} from 'core-decorators';
import compareSets from 'compare-sets';

import Repository from './models/repository';
import FileSystemChangeObserver from './models/file-system-change-observer';
import WorkspaceChangeObserver from './models/workspace-change-observer';
import FilePatchController from './controllers/file-patch-controller';
import GitController from './controllers/git-controller';
import configureStore from './redux/configure-store';

export default class GithubPackage {
  constructor(workspace, project, commandRegistry, notificationManager, config) {
    this.workspace = workspace;
    this.project = project;
    this.commandRegistry = commandRegistry;
    this.notificationManager = notificationManager;
    this.config = config;
    this.repositoriesAndChangeObserversByProjectPath = new Map();
    this.activeRepository = null;
    this.subscriptions = new CompositeDisposable();
    this.savedState = {};
    this.store = null;
  }

  async activate(state = {}) {
    this.savedState = state;
    this.subscriptions = new CompositeDisposable();
    const projectPaths = this.project.getDirectories().map(dir => dir.getRealPathSync());
    this.initialWatchersStartedPromise = this.cacheModelsForPath(projectPaths);
    this.subscriptions.add(
      this.project.onDidChangePaths(this.didChangeProjectPaths),
      this.workspace.onDidChangeActivePaneItem(this.didChangeActivePaneItem),
      this.config.onDidChange('github.githubEnabled', this.rerender),
    );
    if (state.activeRepositoryPath) {
      const repository = await this.getRepositoryForWorkdirPath(state.activeRepositoryPath);
      if (repository) { this.setActiveRepository(repository); }
    } else {
      this.updateActiveRepository();
    }
    this.store = configureStore(state.reduxState);
    this.rerender();
  }

  serialize() {
    const activeRepository = this.getActiveRepository();
    return {
      activeRepositoryPath: activeRepository ? activeRepository.getWorkingDirectoryPath() : null,
      gitController: this.controller.serialize(),
      reduxState: this.store.getState(),
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
      <Provider store={this.store}>
        <GitController
          ref={c => { this.controller = c; }}
          workspace={this.workspace}
          commandRegistry={this.commandRegistry}
          notificationManager={this.notificationManager}
          repository={this.getActiveRepository()}
          statusBar={this.statusBar}
          savedState={this.savedState.gitController}
          githubEnabled={this.config.get('github.githubEnabled')}
        />
      </Provider>, this.element,
    );
  }

  async deactivate() {
    this.subscriptions.dispose();
    if (this.destroyedRepositorySubscription) { this.destroyedRepositorySubscription.dispose(); }
    await this.destroyModelsForPaths(Array.from(this.repositoriesAndChangeObserversByProjectPath.keys()));
  }

  consumeStatusBar(statusBar) {
    this.statusBar = statusBar;
    this.rerender();
  }

  @autobind
  async didChangeProjectPaths(projectPaths) {
    this.updateActiveRepository();
    const previousProjectPaths = Array.from(this.repositoriesAndChangeObserversByProjectPath.keys());
    const {added, removed} = compareSets(new Set(previousProjectPaths), new Set(projectPaths));
    this.cacheModelsForPath(Array.from(added));
    await this.destroyModelsForPaths(Array.from(removed));
  }

  @autobind
  didChangeActivePaneItem() {
    this.updateActiveRepository();
  }

  getInitialWatchersStartedPromise() {
    return this.initialWatchersStartedPromise;
  }

  getActiveRepository() {
    return this.activeRepository;
  }

  async updateActiveRepository() {
    let nextActiveRepository;

    const activeItem = this.workspace.getActivePaneItem();
    if (activeItem && typeof activeItem.getPath === 'function') {
      const projectPath = this.projectPathForItemPath(activeItem.getPath());
      if (projectPath) {
        nextActiveRepository = await this.getRepositoryForWorkdirPath(projectPath);
      }
    } else {
      nextActiveRepository = this.activeRepository;
    }

    if (activeItem instanceof FilePatchController) {
      if (!activeItem.props.repository.isDestroyed()) {
        nextActiveRepository = activeItem.props.repository;
      }
    }

    if (nextActiveRepository && nextActiveRepository !== this.activeRepository) {
      this.setActiveRepository(nextActiveRepository);
      if (this.destroyedRepositorySubscription) { this.destroyedRepositorySubscription.dispose(); }
      this.destroyedRepositorySubscription = nextActiveRepository.onDidDestroy(() => {
        if (nextActiveRepository === this.activeRepository) {
          this.setActiveRepository(null);
        }
        this.destroyedRepositorySubscription.dispose();
      });
    }

    if (!nextActiveRepository) {
      this.setActiveRepository(null);
    }
  }

  setActiveRepository(repository) {
    this.activeRepository = repository;
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
    const models = this.repositoriesAndChangeObserversByProjectPath.get(workdirPath);
    return models ? models.repositoryPromise : null;
  }

  getChangeObserverForWorkdirPath(workdirPath) {
    const models = this.repositoriesAndChangeObserversByProjectPath.get(workdirPath);
    return models ? models.changeObserverPromise : null;
  }

  cacheModelsForPath(addedPaths) {
    return Promise.all(
      addedPaths.map(projectPath => {
        const repositoryPromise = Repository.open(projectPath);
        if (repositoryPromise) {
          const changeObserver = process.platform === 'linux'
          ? new WorkspaceChangeObserver(window, this.workspace, repositoryPromise)
          : new FileSystemChangeObserver(repositoryPromise);
          this.subscriptions.add(
            changeObserver.onDidChange(async () => (await repositoryPromise).refresh()),
            changeObserver.onDidChangeWorkdirOrHead(async () => this.refreshAtomGitRepository(await repositoryPromise)),
          );
          const changeObserverPromise = changeObserver.start();
          this.repositoriesAndChangeObserversByProjectPath.set(projectPath, {repositoryPromise, changeObserverPromise});
          return changeObserverPromise;
        } else {
          return Promise.resolve();
        }
      }),
    );
  }

  destroyModelsForPaths(removedPaths) {
    return Promise.all(
      removedPaths.map(async projectPath => {
        const repositoryPromise = this.getRepositoryForWorkdirPath(projectPath);
        const changeObserverPromise = this.getChangeObserverForWorkdirPath(projectPath);
        this.repositoriesAndChangeObserversByProjectPath.delete(projectPath);

        const repository = await repositoryPromise;
        const changeObserver = await changeObserverPromise;
        // repository and changeObserver may be null if the associated workdir was not a Git repo
        repository && repository.destroy();
        changeObserver && await changeObserver.destroy();
      }),
    );
  }
}
