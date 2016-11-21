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
      ? new WorkspaceChangeObserver(window, this.workspace)
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
      didChangeAmending: this.didChangeAmending.bind(this),
      focusFilePatchView: this.focusFilePatchView.bind(this)
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

  async didSelectFilePatch (filePath, stagingStatus, {activate, amending} = {}) {
    const repository = this.getActiveRepository()
    const filePatch = await repository.getFilePatchForPath(filePath, {staged: stagingStatus === 'staged', amending})
    if (filePatch) {
      let containingPane
      const update = this.didSelectFilePatch.bind(this, filePath, stagingStatus)
      if (this.filePatchController) {
        this.filePatchController.update({filePatch, repository, stagingStatus, update})
        containingPane = this.workspace.paneForItem(this.filePatchController)
      } else {
        this.filePatchController = new FilePatchController({filePatch, repository, stagingStatus, update})
        this.filePatchController.onDidDestroy(() => { this.filePatchController = null })
        containingPane = this.workspace.getActivePane()
      }
      if (activate) {
        containingPane.activateItem(this.filePatchController)
      }
    } else {
      if (this.filePatchController) {
        this.filePatchController.destroy()
        this.filePatchController = null
      }
    }
  }

  focusFilePatchView () {
    this.filePatchController.refs.filePatchView.element.focus()
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

    let activeItem = this.workspace.getActivePaneItem()
    if (activeItem && typeof activeItem.getPath === 'function') {
      let projectDirectory = this.projectDirectoryForPath(activeItem.getPath())
      if (projectDirectory) {
        activeRepository = await this.repositoryForProjectDirectory(projectDirectory)
      }
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
    await this.statusBarTileController.update({repository})
    await this.gitPanelController.update({repository})
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
    this.gitPanelController.destroy()
    this.statusBarTileController.destroy()
    if (this.filePatchController) this.filePatchController.destroy()
  }
}
