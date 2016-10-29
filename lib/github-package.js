/** @babel */

import {CompositeDisposable, Disposable, File} from 'atom'
import Repository from './models/repository'
import FileSystemChangeObserver from './models/file-system-change-observer'
import WorkspaceChangeObserver from './models/workspace-change-observer'
import GitPanelController from './controllers/git-panel-controller'
import FilePatchController from './controllers/file-patch-controller'
import StatusBarTileController from './controllers/status-bar-tile-controller'

import path from 'path'

export default class GithubPackage {
  constructor (workspace, project, commandRegistry, notificationManager) {
    this.workspace = workspace
    this.project = project
    this.commandRegistry = commandRegistry
    this.notificationManager = notificationManager
    this.changeObserver = process.platform === 'linux'
      ? new WorkspaceChangeObserver(window, atom.workspace)
      : new FileSystemChangeObserver()
    this.activeRepository = null
    this.repositoriesByProjectDirectory = new Map()
    this.subscriptions = new CompositeDisposable()
    this.gitPanelController = new GitPanelController({
      repository: null,
      workspace,
      commandRegistry,
      notificationManager,
      didSelectFilePatch: this.didSelectFilePatch.bind(this),
      didSelectMergeConflictFile: this.didSelectMergeConflictFile.bind(this),
      didChangeAmending: this.didChangeAmending.bind(this)
    })
    this.statusBarTileController = new StatusBarTileController({
      workspace,
      repository: null,
      toggleGitPanel: this.toggleGitPanel.bind(this)
    })
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
  }

  async deactivate () {
    await this.changeObserver.stop()
  }

  // FIXME: Combine these 2 methods into a single consumeStatusBar method after
  // Atom 1.13 is on stable channel
  consumeStatusBar_1_0 (statusBar) {
    const tile = statusBar.addRightTile({item: this.statusBarTileController, priority: -50})
    this.subscriptions.add(new Disposable(() => tile.destroy()))
  }

  consumeStatusBar_1_1 (statusBar) {
    statusBar.disableGitInfoTile()
    this.consumeStatusBar_1_0(statusBar)
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

  didSelectFilePatch (filePatch, stagingStatus, {focus} = {}) {
    if (!filePatch || filePatch.isDestroyed()) return
    const repository = this.getActiveRepository()
    let containingPane
    if (this.filePatchController) {
      this.filePatchController.update({filePatch, repository, stagingStatus})
      containingPane = this.workspace.paneForItem(this.filePatchController)
    } else {
      this.filePatchController = new FilePatchController({filePatch, repository, stagingStatus})
      this.filePatchController.onDidDestroy(() => { this.filePatchController = null })
      containingPane = this.workspace.getActivePane()
    }
    containingPane.activateItem(this.filePatchController)
    if (focus) containingPane.activate()
  }

  async didSelectMergeConflictFile (relativeFilePath, {focus} = {}) {
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

  toggleGitPanel () {
    if (this.workspaceGitPanel) {
      this.workspaceGitPanel.destroy()
      this.workspaceGitPanel = null
    } else {
      this.focusGitPanel()
    }
  }

  focusGitPanel () {
    this.workspaceGitPanel = this.workspace.addRightPanel({item: this.gitPanelController})
    this.gitPanelController.focus()
  }

  getActiveRepository () {
    return this.activeRepository
  }

  async updateActiveRepository () {
    let activeRepository

    if (this.activeRepository && this.project.getDirectories().indexOf(this.activeRepository.getWorkingDirectory()) === -1) {
      this.activeRepository = null
      await this.changeObserver.setActiveRepository(null)
    }

    let activeItem = this.workspace.getActivePaneItem()
    if (activeItem && typeof activeItem.getPath === 'function') {
      let projectDirectory = this.projectDirectoryForPath(activeItem.getPath())
      if (projectDirectory) {
        activeRepository = await this.repositoryForProjectDirectory(projectDirectory)
      }
    }

    if (!(activeRepository || this.activeRepository)) {
      for (let directory of this.project.getDirectories()) {
        activeRepository = await this.repositoryForProjectDirectory(directory) // eslint-disable-line babel/no-await-in-loop
        if (activeRepository) break
      }
    }

    if (activeRepository && activeRepository !== this.activeRepository) {
      this.activeRepository = activeRepository
      await this.statusBarTileController.update({repository: this.getActiveRepository()})
      await this.gitPanelController.update({repository: this.getActiveRepository()})
      await this.changeObserver.setActiveRepository(this.getActiveRepository())
    }
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
    this.gitPanelController.destroy()
  }
}
