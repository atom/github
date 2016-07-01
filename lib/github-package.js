/** @babel */

import {CompositeDisposable} from 'atom'
import Repository from './models/repository'
import CommitPanelView from './views/commit-panel-view'
import FilePatchView from './views/file-patch-view'
import nsfw from 'nsfw'

export default class GithubPackage {
  constructor (workspace, project, commandRegistry) {
    this.workspace = workspace
    this.project = project
    this.activeRepository = null
    this.repositoriesByProjectDirectory = new Map()
    this.subscriptions = new CompositeDisposable()
    this.commitPanelView = new CommitPanelView({repository: null, workspace, commandRegistry, didSelectFilePatch: this.didSelectFilePatch.bind(this)})
    this.filePatchView = null
    this.lastFileChangePromise = null
    this.resolveLastFileChangePromise = null
  }

  async activate () {
    await this.updateActiveRepository()
    await this.commitPanelView.update({repository: this.getActiveRepository()})
    this.workspace.addRightPanel({item: this.commitPanelView})

    this.subscriptions.add(
      this.project.onDidChangePaths(this.didChangeProjectPaths.bind(this)),
      this.workspace.onDidChangeActivePaneItem(this.didChangeActivePaneItem.bind(this))
    )
  }

  async didChangeProjectPaths () {
    await this.destroyRepositoriesForRemovedProjectFolders()
    await this.updateActiveRepository()
    await this.commitPanelView.update({repository: this.getActiveRepository()})
  }

  async didChangeActivePaneItem () {
    await this.updateActiveRepository()
    await this.commitPanelView.update({repository: this.getActiveRepository()})
  }

  didSelectFilePatch (filePatch, stagingStatus) {
    const repository = this.getActiveRepository()
    if (this.filePatchView) {
      this.filePatchView.update({filePatch, repository, stagingStatus})
      const containingPane = this.workspace.paneForItem(this.filePatchView)
      containingPane.activate()
      containingPane.activateItem(this.filePatchView)
    } else {
      this.filePatchView = new FilePatchView({filePatch, repository, stagingStatus})
      this.filePatchView.onDidDestroy(() => { this.filePatchView = null })
      this.workspace.getActivePane().activateItem(this.filePatchView)
    }
  }

  getActiveRepository () {
    return this.activeRepository
  }

  async updateActiveRepository () {
    let activeRepository

    if (this.activeRepository && this.project.getDirectories().indexOf(this.activeRepository.getWorkingDirectory()) === -1) {
      this.activeRepository = null
      await this.currentFileWatcher.stop()
      this.currentFileWatcher = null
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

    if (activeRepository) {
      if (this.activeRepository) {
        await this.currentFileWatcher.stop()
      }
      this.activeRepository = activeRepository
      this.lastFileChangePromise = new Promise((resolve) => this.resolveLastFileChangePromise = resolve)
      this.currentFileWatcher = await nsfw(activeRepository.getWorkingDirectoryPath(), async () => {
        await activeRepository.refresh()
        this.resolveLastFileChangePromise()
        this.lastFileChangePromise = new Promise((resolve) => this.resolveLastFileChangePromise = resolve)
      })
      await this.currentFileWatcher.start()
    }
  }

  projectDirectoryForPath (path) {
    return this.project.getDirectories().find(d => d.getPath() === path || d.contains(path))
  }

  async repositoryForProjectDirectory (projectDirectory) {
    let repository = this.repositoriesByProjectDirectory.get(projectDirectory)

    if (!repository) {
      const atomRepository = await this.project.repositoryForDirectory(projectDirectory)
      if (atomRepository == null) {
        return
      } else {
        const rawRepository = await atomRepository.async.repo.repoPromise
        repository = new Repository(rawRepository, projectDirectory)
        this.repositoriesByProjectDirectory.set(projectDirectory, repository)
      }
    }

    return repository
  }

  async repositoryForWorkdirPath (workdirPath) {
    return this.repositoryForProjectDirectory(this.projectDirectoryForPath(workdirPath))
  }

  destroyRepositoriesForRemovedProjectFolders () {
    const projectDirectories = this.project.getDirectories()
    for (let [projectDirectory] of this.repositoriesByProjectDirectory) {
      if (projectDirectories.indexOf(projectDirectory) === -1) {
        this.repositoriesByProjectDirectory.delete(projectDirectory)
      }
    }
  }

  destroy () {
    this.subscriptions.dispose()
    this.commitPanelView.destroy()
  }
}
