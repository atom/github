/** @babel */

import path from 'path'
import GithubPackage from '../lib/github-package'
import {copyRepositoryDir} from './helpers'

describe('GithubPackage', () => {
  let atomEnv, workspace, project, githubPackage

  beforeEach(() => {
    atomEnv = global.buildAtomEnvironment()
    workspace = atomEnv.workspace
    project = atomEnv.project
    githubPackage = new GithubPackage(workspace, project)
  })

  afterEach(() => {
    atomEnv.destroy()
  })

  describe('when the package is activated', () => {
    it('updates the active repository', async () => {
      const workdirPath1 = copyRepositoryDir()
      const workdirPath2 = copyRepositoryDir()
      project.setPaths([workdirPath1, workdirPath2])

      await workspace.open(path.join(workdirPath1, 'a.txt'))
      await githubPackage.activate()
      assert.equal(githubPackage.getActiveRepository(), await githubPackage.repositoryForWorkdirPath(workdirPath1))
    })
  })

  describe('the "did-change" event', () => {
    it('triggers when the project paths change', async () => {
      let eventCount = 0
      githubPackage.onDidChange(() => eventCount++)

      const workdirPath1 = copyRepositoryDir()
      const workdirPath2 = copyRepositoryDir()
      project.setPaths([workdirPath1, workdirPath2])

      await githubPackage.didChangeProjectPaths()
      assert.equal(eventCount, 1)
      await githubPackage.didChangeProjectPaths()
      assert.equal(eventCount, 2)
    })

    it('triggers when the active pane item changes', async () => {
      let eventCount = 0
      githubPackage.onDidChange(() => eventCount++)

      const workdirPath1 = copyRepositoryDir()
      const workdirPath2 = copyRepositoryDir()
      project.setPaths([workdirPath1, workdirPath2])

      await githubPackage.didChangeActivePaneItem()
      assert.equal(eventCount, 1)
      await githubPackage.didChangeActivePaneItem()
      assert.equal(eventCount, 2)
    })
  })

  describe('updateActiveRepository', () => {
    it('updates the active repository based on the most recent active item with a path unless its directory has been removed from the project', async () => {
      const workdirPath1 = copyRepositoryDir()
      const workdirPath2 = copyRepositoryDir()
      project.setPaths([workdirPath1, workdirPath2])

      await workspace.open(path.join(workdirPath1, 'a.txt'))
      await workspace.open(path.join(workdirPath2, 'b.txt'))

      assert.isNull(githubPackage.getActiveRepository())

      await githubPackage.updateActiveRepository()
      assert.equal(githubPackage.getActiveRepository(), await githubPackage.repositoryForWorkdirPath(workdirPath2))

      await workspace.open(path.join(workdirPath1, 'a.txt'))
      await githubPackage.updateActiveRepository()
      assert.equal(githubPackage.getActiveRepository(), await githubPackage.repositoryForWorkdirPath(workdirPath1))

      await workspace.open(path.join(workdirPath2, 'b.txt'))
      await githubPackage.updateActiveRepository()
      assert.equal(githubPackage.getActiveRepository(), await githubPackage.repositoryForWorkdirPath(workdirPath2))

      workspace.getActivePane().activateItem({})
      await githubPackage.updateActiveRepository()
      assert.equal(githubPackage.getActiveRepository(), await githubPackage.repositoryForWorkdirPath(workdirPath2))

      project.removePath(workdirPath2)
      await githubPackage.updateActiveRepository()
      assert.equal(githubPackage.getActiveRepository(), await githubPackage.repositoryForWorkdirPath(workdirPath1))

      project.removePath(workdirPath1)
      await githubPackage.updateActiveRepository()
      assert.isNull(githubPackage.getActiveRepository())
    })
  })

  describe('destroyRepositoriesForRemovedProjectFolders', () => {
    it('destroys all the repositories associated with the removed project folders', async () => {
      const workdirPath1 = copyRepositoryDir()
      const workdirPath2 = copyRepositoryDir()
      const workdirPath3 = copyRepositoryDir()
      project.setPaths([workdirPath1, workdirPath2, workdirPath3])

      await workspace.open(path.join(workdirPath1, 'a.txt'))
      await githubPackage.updateActiveRepository()
      const repository1 = await githubPackage.repositoryForWorkdirPath(workdirPath1)

      await workspace.open(path.join(workdirPath2, 'a.txt'))
      await githubPackage.updateActiveRepository()
      const repository2 = await githubPackage.repositoryForWorkdirPath(workdirPath2)

      await workspace.open(path.join(workdirPath3, 'a.txt'))
      await githubPackage.updateActiveRepository()
      const repository3 = await githubPackage.repositoryForWorkdirPath(workdirPath3)

      project.removePath(workdirPath1)
      project.removePath(workdirPath3)
      githubPackage.destroyRepositoriesForRemovedProjectFolders()

      assert.isUndefined(await githubPackage.repositoryForProjectDirectory(repository1.getWorkingDirectory()))
      assert.isUndefined(await githubPackage.repositoryForProjectDirectory(repository3.getWorkingDirectory()))
      assert.equal(await githubPackage.repositoryForProjectDirectory(repository2.getWorkingDirectory()), repository2)
    })
  })
})
