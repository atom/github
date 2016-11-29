/** @babel */

import {CompositeDisposable, Disposable, Directory, File} from 'atom'
import Repository from './models/repository'
import FileSystemChangeObserver from './models/file-system-change-observer'
import WorkspaceChangeObserver from './models/workspace-change-observer'
import FilePatchController from './controllers/file-patch-controller'
import GitController from './controllers/git-controller'

import path from 'path'

import React from 'react'
import ReactDom from 'react-dom'

export default class GithubPackage {
  constructor (workspace, project, commandRegistry, notificationManager) {
    this.workspace = workspace
    this.project = project
    this.commandRegistry = commandRegistry
    this.notificationManager = notificationManager
    this.changeObserver = process.platform === 'linux'
      ? new WorkspaceChangeObserver(window, this.workspace)
      : new FileSystemChangeObserver()
    this.activeRepository = null
    this.repositoriesByProjectDirectory = new Map()
    this.gitPanelActive = false
    this.subscriptions = new CompositeDisposable()
  }

  async activate (state = {}) {
    this.subscriptions = new CompositeDisposable()
    await this.updateActiveRepository()
    await this.changeObserver.start()
    this.subscriptions.add(
      new Disposable(() => this.changeObserver.stop()),
      this.project.onDidChangePaths(this.didChangeProjectPaths.bind(this)),
      this.workspace.onDidChangeActivePaneItem(this.didChangeActivePaneItem.bind(this)),
      this.changeObserver.onDidChange(this.refreshActiveRepository.bind(this)),
      this.commandRegistry.add('atom-workspace', {'git:toggle-git-panel': this.toggleGitPanel.bind(this)}),
      this.commandRegistry.add('atom-workspace', {'git:focus-git-panel': this.focusGitPanel.bind(this)})
    )
    this.gitPanelActive = !!state.gitPanelActive
    if (state.activeRepositoryDir) {
      const dir = new Directory(state.activeRepositoryDir)
      const repo = await this.repositoryForProjectDirectory(dir)
      if (repo) {
        await this.setActiveRepository(repo)
      }
    }
    this.rerender()
  }

  serialize () {
    const activeRepository = this.getActiveRepository()
    return {
      gitPanelActive: this.gitPanelActive,
      activeRepositoryDir: activeRepository ? activeRepository.getWorkingDirectoryPath() : null,
    }
  }

  rerender (callback = null) {
    if (!this.element) {
      this.element = document.createElement('div')
      this.subscriptions.add(new Disposable(() => {
        ReactDom.unmountComponentAtNode(this.element)
        delete this.element
      }))
    }

    ReactDom.render(
      <GitController
        ref={c => this.controller = c}
        workspace={this.workspace}
        commandRegistry={this.commandRegistry}
        notificationManager={this.notificationManager}
        repository={this.getActiveRepository()}
        statusBar={this.statusBar}
        gitPanelActive={this.gitPanelActive}
      />, this.element, typeof callback === 'function' ? callback : null
    )
  }

  async deactivate () {
    this.subscriptions.dispose()
    if (this.destroyedRepositorySubscription) this.destroyedRepositorySubscription.dispose()
  }

  consumeStatusBar (statusBar) {
    this.statusBar = statusBar
    this.rerender()
  }

  async didChangeProjectPaths () {
    await this.updateActiveRepository()
    this.destroyRepositoriesForRemovedProjectFolders()
  }

  async didChangeActivePaneItem () {
    await this.updateActiveRepository()
  }

  async refreshActiveRepository () {
    if (this.activeRepository) {
      await this.activeRepository.refresh()
    }
  }

  focusFilePatchView () {
    // TODO: migrate to ref
    this.filePatchController.refs.filePatchView.element.focus()
  }

  toggleGitPanel (callback) {
    this.gitPanelActive = !this.gitPanelActive
    this.rerender(callback)
  }

  focusGitPanel () {
    if (!this.gitPanelActive) {
      this.toggleGitPanel(() => {
        // TODO: why doesn't a setTimeout of 0 or even 100 work here?
        // Suspect it has to do with the command palette closing...
        setTimeout(() => this.controller.gitPanelController.getWrappedComponent().focus(), 200)
      })
    }
  }

  getActiveRepository () {
    return this.activeRepository
  }

  async updateActiveRepository () {
    let nextActiveRepository

    let activeItem = this.workspace.getActivePaneItem()
    if (activeItem && typeof activeItem.getPath === 'function') {
      let projectDirectory = this.projectDirectoryForPath(activeItem.getPath())
      if (projectDirectory) {
        nextActiveRepository = await this.repositoryForProjectDirectory(projectDirectory)
      }
    } else {
      nextActiveRepository = this.activeRepository
    }

    if (activeItem instanceof FilePatchController) {
      if (!activeItem.props.repository.isDestroyed()) {
        nextActiveRepository = activeItem.props.repository
      }
    }

    if (nextActiveRepository && nextActiveRepository !== this.activeRepository) {
      await this.setActiveRepository(nextActiveRepository)
      if (this.destroyedRepositorySubscription) this.destroyedRepositorySubscription.dispose()
      this.destroyedRepositorySubscription = nextActiveRepository.onDidDestroy(() => {
        if (nextActiveRepository === this.activeRepository) {
          this.setActiveRepository(null)
        }
        this.destroyedRepositorySubscription.dispose()
      })
    }

    if (!nextActiveRepository) {
      await this.setActiveRepository(null)
    }
  }

  async setActiveRepository (repository) {
    this.activeRepository = repository
    await this.changeObserver.setActiveRepository(repository)
    this.rerender()
  }

  projectDirectoryForPath (path) {
    return this.project.getDirectories().find(d => d.getPath() === path || d.contains(path))
  }

  async repositoryForProjectDirectory (projectDirectory) {
    let repository = this.repositoriesByProjectDirectory.get(projectDirectory)
    if (!repository) {
      repository = await Repository.open(projectDirectory)
      if (repository) this.repositoriesByProjectDirectory.set(projectDirectory, repository)
    }
    return repository
  }

  async repositoryForWorkdirPath (workdirPath) {
    return this.repositoryForProjectDirectory(this.projectDirectoryForPath(workdirPath))
  }

  destroyRepositoriesForRemovedProjectFolders () {
    const projectDirectories = this.project.getDirectories()
    for (let [projectDirectory, repository] of this.repositoriesByProjectDirectory) {
      if (projectDirectories.indexOf(projectDirectory) === -1) {
        repository.destroy()
        this.repositoriesByProjectDirectory.delete(projectDirectory)
      }
    }
  }
}
