/** @babel */

import {CompositeDisposable, Disposable, Directory} from 'atom';
import Repository from './models/repository';
import FileSystemChangeObserver from './models/file-system-change-observer';
import WorkspaceChangeObserver from './models/workspace-change-observer';
import FilePatchController from './controllers/file-patch-controller';
import GitController from './controllers/git-controller';

import React from 'react';
import ReactDom from 'react-dom';

export default class GithubPackage {
  constructor(workspace, project, commandRegistry, notificationManager) {
    this.workspace = workspace;
    this.project = project;
    this.commandRegistry = commandRegistry;
    this.notificationManager = notificationManager;
    this.changeObserversByProjectPath = new Map();
    this.activeRepository = null;
    this.repositoriesByProjectPath = new Map();
    this.subscriptions = new CompositeDisposable();
    this.savedState = {};
  }

  async activate(state = {}) {
    this.savedState = state;
    this.subscriptions = new CompositeDisposable();
    await this.updateActiveRepository();
    this.subscriptions.add(
      this.project.onDidChangePaths(this.didChangeProjectPaths.bind(this)),
      this.workspace.onDidChangeActivePaneItem(this.didChangeActivePaneItem.bind(this)),
    );
    if (state.activeRepositoryDir) {
      const dir = new Directory(state.activeRepositoryDir);
      const repo = await this.repositoryForProjectDirectory(dir);
      if (repo) {
        this.setActiveRepository(repo);
        this.watchRepoForUpdates(repo);
      }
    }
    this.rerender();
  }

  serialize() {
    const activeRepository = this.getActiveRepository();
    return {
      activeRepositoryDir: activeRepository ? activeRepository.getWorkingDirectoryPath() : null,
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
    this.changeObserversByProjectPath.forEach(observer => observer.destroy());
  }

  consumeStatusBar(statusBar) {
    this.statusBar = statusBar;
    this.rerender();
  }

  async didChangeProjectPaths() {
    await this.updateActiveRepository();
    this.destroyRepositoriesForRemovedProjectFolders();
  }

  async didChangeActivePaneItem() {
    await this.updateActiveRepository();
  }

  async refreshActiveRepository() {
    if (this.activeRepository) {
      await this.activeRepository.refresh();
    }
  }

  getActiveRepository() {
    return this.activeRepository;
  }

  async updateActiveRepository() {
    let nextActiveRepository;

    const activeItem = this.workspace.getActivePaneItem();
    if (activeItem && typeof activeItem.getPath === 'function') {
      const projectDirectory = this.projectDirectoryForItemPath(activeItem.getPath());
      if (projectDirectory) {
        nextActiveRepository = await this.repositoryForProjectDirectory(projectDirectory);
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
      this.watchRepoForUpdates(nextActiveRepository);
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

  watchRepoForUpdates(repository) {
    if (!repository) { return; }
    if (!this.changeObserversByProjectPath.get(repository.getWorkingDirectoryPath())) {
      const changeObserver = process.platform === 'linux'
          ? new WorkspaceChangeObserver(window, this.workspace, repository)
          : new FileSystemChangeObserver(repository);
      this.changeObserversByProjectPath.set(repository.getWorkingDirectoryPath(), changeObserver);
      changeObserver.start();
      this.subscriptions.add(
        changeObserver.onDidChange(() => {
          repository.refresh();
          this.refreshAtomGitRepo(repository);
        }),
      );
    }
  }

  refreshAtomGitRepo(repository) {
    const repoPath = repository.getWorkingDirectoryPath();
    const atomGitRepo = this.project.getRepositories().find(repo => repo && repo.getWorkingDirectory() === repoPath);
    return atomGitRepo ? atomGitRepo.refreshStatus() : Promise.resolve();
  }

  projectDirectoryForItemPath(filePath) {
    return this.project.getDirectories().find(d => d.getPath() === filePath || d.contains(filePath));
  }

  async repositoryForProjectDirectory(projectDirectory) {
    const projectDirectoryPath = projectDirectory.getPath();
    let repository = this.repositoriesByProjectPath.get(projectDirectoryPath);
    if (!repository) {
      repository = await Repository.open(projectDirectory);
      if (this.repositoriesByProjectPath.has(projectDirectoryPath)) {
        // Someone else found and set the repo in the cache while we were nabbing it.
        // Defer to that repo.
        repository.destroy();
        repository = this.repositoriesByProjectPath.get(projectDirectoryPath);
      } else if (repository) {
        this.repositoriesByProjectPath.set(projectDirectoryPath, repository);
      }
    }
    return repository;
  }

  repositoryForWorkdirPath(workdirPath) {
    return this.repositoryForProjectDirectory(this.projectDirectoryForItemPath(workdirPath));
  }

  destroyRepositoriesForRemovedProjectFolders() {
    const projectDirectoryPaths = this.project.getDirectories().map(dir => dir.getPath());
    for (const [projectDirectoryPath, repository] of this.repositoriesByProjectPath) {
      if (projectDirectoryPaths.indexOf(projectDirectoryPath) === -1) {
        repository.destroy();
        this.repositoriesByProjectPath.delete(projectDirectoryPath);
        const changeObserver = this.changeObserversByProjectPath.get(projectDirectoryPath);
        if (changeObserver) {
          changeObserver.destroy();
          this.changeObserversByProjectPath.delete(projectDirectoryPath);
        }
      }
    }
  }
}
