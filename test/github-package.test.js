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
      assert.isNull(githubPackage.getActiveRepository())

      await workspace.open(path.join(workdirPath1, 'a.txt'))
      await githubPackage.updateActiveRepository()
      assert.equal(githubPackage.getActiveRepository(), await githubPackage.repositoryForWorkdirPath(workdirPath1))

      project.removePath(workdirPath1)
      await githubPackage.updateActiveRepository()
      assert.isNull(githubPackage.getActiveRepository())
    })
  })
})
