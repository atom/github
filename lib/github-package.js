/** @babel */

import {CompositeDisposable, Disposable} from 'atom';
import Repository from './models/repository';
import FileSystemChangeObserver from './models/file-system-change-observer';
import WorkspaceChangeObserver from './models/workspace-change-observer';
import FilePatchController from './controllers/file-patch-controller';
import GitController from './controllers/git-controller';

import React from 'react';
import ReactDom from 'react-dom';
import compareSets from 'compare-sets';

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
    // TODO: this will make start up time slower. first cacheModel for first repo, then do the rest
    await this.cacheModelsForPath(this.project.getPaths());
    this.subscriptions.add(
      this.project.onDidChangePaths(this.didChangeProjectPaths.bind(this)),
      this.workspace.onDidChangeActivePaneItem(this.didChangeActivePaneItem.bind(this)),
    );
    if (state.activeRepositoryPath) {
      const {repository} = this.repositoriesAndChangeObserversByProjectPath.get(state.activeRepositoryPath);
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

  didChangeProjectPaths(projectPaths) {
    this.updateActiveRepository();
    const previousProjectPaths = Array.from(this.repositoriesAndChangeObserversByProjectPath.keys());
    const {added, removed} = compareSets(new Set(previousProjectPaths), new Set(projectPaths));
    this.cacheModelsForPath(Array.from(added));
    this.destroyModelsForPaths(Array.from(removed));
  }

  didChangeActivePaneItem() {
    this.updateActiveRepository();
  }

  getActiveRepository() {
    return this.activeRepository;
  }

  updateActiveRepository() {
    let nextActiveRepository;

    const activeItem = this.workspace.getActivePaneItem();
    if (activeItem && typeof activeItem.getPath === 'function') {
      const projectPath = this.projectPathForItemPath(activeItem.getPath());
      if (projectPath) {
        nextActiveRepository = this.getRepositoryForWorkdirPath(projectPath);
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
    return models ? models.repository : null;
  }

  getChangeObserverForWorkdirPath(workdirPath) {
    const models = this.repositoriesAndChangeObserversByProjectPath.get(workdirPath);
    return models ? models.changeObserver : null;
  }

  cacheModelsForPath(addedPaths) {
    return Promise.all(addedPaths.map(async projectPath => {
      const repository = await Repository.open(projectPath);
      if (repository) {
        const changeObserver = process.platform === 'linux'
        ? new WorkspaceChangeObserver(window, this.workspace, repository)
        : new FileSystemChangeObserver(repository);
        this.subscriptions.add(
          changeObserver.onDidChange(() => repository.refresh()),
          changeObserver.onDidChangeWorkdirOrHead(() => this.refreshAtomGitRepository(repository)),
        );
        await changeObserver.start();
        this.repositoriesAndChangeObserversByProjectPath.set(projectPath, {repository, changeObserver});
      }
    }));
  }

  destroyModelsForPaths(removedPaths) {
    removedPaths.forEach(projectPath => {
      const {repository, changeObserver} = this.repositoriesAndChangeObserversByProjectPath.get(projectPath);
      repository.destroy();
      changeObserver.destroy();
      this.repositoriesAndChangeObserversByProjectPath.delete(projectPath);
    });
  }
}
