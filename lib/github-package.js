/** @babel */

import Repository from './repository'

export default class GithubPackage {
  constructor (workspace, project) {
    this.workspace = workspace
    this.project = project
    this.activeRepository = null
    this.repositoriesByProjectDirectory = new Map
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
      const rawRepository = await atomRepository.async.repo.repoPromise
      repository = new Repository(rawRepository, projectDirectory)
      this.repositoriesByProjectDirectory.set(projectDirectory, repository)
    }

    return repository
  }

  repositoryForWorkdirPath (workdirPath) {
    return this.repositoryForProjectDirectory(this.projectDirectoryForPath(workdirPath))
  }
}
