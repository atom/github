import {CompositeDisposable, Disposable} from 'atom';

import React from 'react';
import ReactDom from 'react-dom';
import {autobind} from 'core-decorators';
import compareSets from 'compare-sets';

import Repository from './models/repository';
import FileSystemChangeObserver from './models/file-system-change-observer';
import WorkspaceChangeObserver from './models/workspace-change-observer';
import FilePatchController from './controllers/file-patch-controller';
import GitController from './controllers/git-controller';

export default class GithubPackage {
  constructor(workspace, project, commandRegistry, notificationManager) {
    this.workspace = workspace;
    this.project = project;
    this.commandRegistry = commandRegistry;
    this.notificationManager = notificationManager;
    this.repositoriesAndChangeObserversByProjectPath = new Map();
    this.activeRepository = null;
    this.subscriptions = new CompositeDisposable();
    this.savedState = {};
  }

  async activate(state = {}) {
    this.savedState = state;
    this.subscriptions = new CompositeDisposable();
    this.cacheModelsForPath(this.project.getPaths());
    this.subscriptions.add(
      this.project.onDidChangePaths(this.didChangeProjectPaths),
      this.workspace.onDidChangeActivePaneItem(this.didChangeActivePaneItem),
    );
    if (state.activeRepositoryPath) {
      const repository = await this.getRepositoryForWorkdirPath(state.activeRepositoryPath);
      if (repository) { this.setActiveRepository(repository); }
    } else {
      this.updateActiveRepository();
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
        statusBar={this.statusBar}
        savedState={this.savedState.gitController}
      />, this.element,
    );
  }

  deactivate() {
    this.subscriptions.dispose();
    if (this.destroyedRepositorySubscription) { this.destroyedRepositorySubscription.dispose(); }
    this.destroyModelsForPaths(Array.from(this.repositoriesAndChangeObserversByProjectPath.keys()));
  }

  consumeStatusBar(statusBar) {
    this.statusBar = statusBar;
    this.rerender();
  }

  @autobind
  didChangeProjectPaths(projectPaths) {
    this.updateActiveRepository();
    const previousProjectPaths = Array.from(this.repositoriesAndChangeObserversByProjectPath.keys());
    const {added, removed} = compareSets(new Set(previousProjectPaths), new Set(projectPaths));
    this.cacheModelsForPath(Array.from(added));
    this.destroyModelsForPaths(Array.from(removed));
  }

  @autobind
  didChangeActivePaneItem() {
    this.updateActiveRepository();
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
    const atomGitRepo = this.project.getRepositories().find(repo => repo && repo.getWorkingDirectory() === repoPath);
    return atomGitRepo ? atomGitRepo.refreshStatus() : Promise.resolve();
  }

  projectPathForItemPath(filePath) {
    return this.project.getPaths().find(projectPath => filePath.startsWith(projectPath));
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
    addedPaths.forEach(projectPath => {
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
      }
    });
  }

  destroyModelsForPaths(removedPaths) {
    removedPaths.forEach(async projectPath => {
      const repositoryPromise = this.getRepositoryForWorkdirPath(projectPath);
      const changeObserverPromise = this.getChangeObserverForWorkdirPath(projectPath);
      this.repositoriesAndChangeObserversByProjectPath.delete(projectPath);

      const repository = await repositoryPromise;
      const changeObserver = await changeObserverPromise;
      // repository and changeObserver may be null if the associated workdir was not a Git repo
      repository && repository.destroy();
      changeObserver && changeObserver.destroy();
    });
  }
}
