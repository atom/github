/** @babel */

import {Emitter, CompositeDisposable} from 'atom'
import Repository from './repository'
import CommitPanelComponent from './commit-panel-component'

export default class GithubPackage {
  constructor (workspace, project) {
    this.workspace = workspace
    this.project = project
    this.activeRepository = null
    this.fileDiffPaneItem = null
    this.repositoriesByProjectDirectory = new Map
    this.subscriptions = new CompositeDisposable
    this.commitPanelComponent = new CommitPanelComponent({repository: null, didSelectFilePatch: this.didSelectFilePatch.bind(this)})
  }

  async activate () {
    await this.updateActiveRepository()
    await this.commitPanelComponent.update({repository: this.getActiveRepository()})
    this.workspace.addRightPanel({item: this.commitPanelComponent})

    this.subscriptions.add(
      this.project.onDidChangePaths(this.didChangeProjectPaths.bind(this)),
      this.workspace.onDidChangeActivePaneItem(this.didChangeActivePaneItem.bind(this))
    )
  }

  async didChangeProjectPaths () {
    await this.destroyRepositoriesForRemovedProjectFolders()
    await this.updateActiveRepository()
    await this.commitPanelComponent.update({repository: this.getActiveRepository()})
  }

  async didChangeActivePaneItem () {
    await this.updateActiveRepository()
    await this.commitPanelComponent.update({repository: this.getActiveRepository()})
  }

  didSelectFilePatch (filePatch, stageStatus) {
    // TODO: render fileDiffView in designated fileDiffPaneItem
  }

  getActiveRepository () {
    return this.activeRepository
  }

  async updateActiveRepository () {
    let activeRepository

    if (this.activeRepository && this.project.getDirectories().indexOf(this.activeRepository.getWorkingDirectory()) === -1) {
      this.activeRepository = null
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
        activeRepository = await this.repositoryForProjectDirectory(directory)
        if (activeRepository) break
      }
    }

    if (activeRepository) {
      this.activeRepository = activeRepository
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
    for (let [projectDirectory, repository] of this.repositoriesByProjectDirectory) {
      if (projectDirectories.indexOf(projectDirectory) === -1) {
        this.repositoriesByProjectDirectory.delete(projectDirectory)
      }
    }
  }
}
