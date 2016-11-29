/** @babel */

import {CompositeDisposable, Disposable, File} from 'atom'
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
    this.subscriptions = new CompositeDisposable()
    this.filePatchController = null
  }

  async activate () {
    await this.updateActiveRepository()
    await this.changeObserver.start()
    this.subscriptions.add(
      this.project.onDidChangePaths(this.didChangeProjectPaths.bind(this)),
      this.workspace.onDidChangeActivePaneItem(this.didChangeActivePaneItem.bind(this)),
      this.changeObserver.onDidChange(this.refreshActiveRepository.bind(this)),
      this.commandRegistry.add('atom-workspace', {'git:toggle-git-panel': this.toggleGitPanel.bind(this)}),
      this.commandRegistry.add('atom-workspace', {'git:focus-git-panel': this.focusGitPanel.bind(this)})
    )
    this.rerender()
  }

  rerender (callback = null) {
    if (!this.element) {
      this.element = document.createElement('div')
    }

    ReactDom.render(
      <GitController
        ref={c => this.controller = c}
        workspace={this.workspace}
        commandRegistry={this.commandRegistry}
        notificationManager={this.notificationManager}
        repository={this.getActiveRepository()}
        statusBar={this.statusBar}
        legacyStatusBar={this.legacyStatusBar}
        gitPanelActive={this.gitPanelActive}
      />, this.element, typeof callback === 'function' ? callback : null
    )
  }

  async deactivate () {
    await this.changeObserver.stop()
  }

  // FIXME: Combine these 2 methods into a single consumeStatusBar method after
  // Atom 1.13 is on stable channel
  consumeStatusBar_1_0 (statusBar) {
    this.statusBar = statusBar
    this.legacyStatusBar = true
    this.rerender()
  }

  consumeStatusBar_1_1 (statusBar) {
    this.statusBar = statusBar
    this.legacyStatusBar = false
    this.rerender()
  }

  async didChangeProjectPaths () {
    await this.destroyRepositoriesForRemovedProjectFolders()
    await this.updateActiveRepository()
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
    this.filePatchController.refs.filePatchView.element.focus()
  }

  async showMergeConflictFileForPath (relativeFilePath, {focus} = {}) {
    const absolutePath = path.join(this.getActiveRepository().getWorkingDirectoryPath(), relativeFilePath)
    if (await new File(absolutePath).exists()) {
      return this.workspace.open(absolutePath, {activatePane: Boolean(focus)})
    } else {
      this.notificationManager.addInfo('File has been deleted.')
    }
  }

  didChangeAmending () {
    if (this.filePatchController && this.filePatchController.props.stagingStatus === 'staged') {
      this.filePatchController.destroy()
      this.filePatchController = null
    }
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
    let activeRepository

    let activeItem = this.workspace.getActivePaneItem()
    if (activeItem && typeof activeItem.getPath === 'function') {
      let projectDirectory = this.projectDirectoryForPath(activeItem.getPath())
      if (projectDirectory) {
        activeRepository = await this.repositoryForProjectDirectory(projectDirectory)
      }
    } else {
      activeRepository = this.activeRepository
    }

    if (activeItem instanceof FilePatchController) {
      if (!activeItem.props.repository.isDestroyed()) {
        activeRepository = activeItem.props.repository
      }
    }

    if (activeRepository && activeRepository !== this.activeRepository) {
      await this.setActiveRepository(activeRepository)
      if (this.destroyedRepositorySubscription) this.destroyedRepositorySubscription.dispose()
      this.destroyedRepositorySubscription = activeRepository.onDidDestroy(() => {
        this.setActiveRepository(null)
        this.destroyedRepositorySubscription.dispose()
      })
    }

    if (!activeRepository) {
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

  destroy () {
    this.subscriptions.dispose()
    if (this.destroyedRepositorySubscription) this.destroyedRepositorySubscription.dispose()
    if (this.filePatchController) this.filePatchController.destroy()
    if (this.element) {
      ReactDom.unmountComponentAtNode(this.element)
      delete this.element
    }
  }
}
