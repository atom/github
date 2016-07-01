/** @babel */

import fs from 'fs'
import path from 'path'
import temp from 'temp'
import {copyRepositoryDir} from './helpers'
import FilePatch from '../lib/models/file-patch'
import GithubPackage from '../lib/github-package'

describe('GithubPackage', () => {
  let atomEnv, workspace, project, githubPackage

  beforeEach(() => {
    atomEnv = global.buildAtomEnvironment()
    workspace = atomEnv.workspace
    project = atomEnv.project
    githubPackage = new GithubPackage(workspace, project, atomEnv.commands)
  })

  afterEach(() => {
    atomEnv.destroy()
  })

  describe('activate', () => {
    it('updates the active repository', async () => {
      const workdirPath1 = copyRepositoryDir()
      const workdirPath2 = copyRepositoryDir()
      project.setPaths([workdirPath1, workdirPath2])
      fs.writeFileSync(path.join(workdirPath1, 'a.txt'), 'change 1', 'utf8')
      fs.writeFileSync(path.join(workdirPath1, 'b.txt'), 'change 2', 'utf8')

      await workspace.open(path.join(workdirPath1, 'a.txt'))
      await githubPackage.activate()
      assert.equal(githubPackage.getActiveRepository(), await githubPackage.repositoryForWorkdirPath(workdirPath1))
      assert.equal(githubPackage.commitPanelView.repository, githubPackage.getActiveRepository())
    })
  })

  describe('didChangeProjectPaths', () => {
    it('updates the active repository', async () => {
      const workdirPath1 = copyRepositoryDir()
      const workdirPath2 = copyRepositoryDir()
      project.setPaths([workdirPath1, workdirPath2])
      fs.writeFileSync(path.join(workdirPath1, 'a.txt'), 'change 1', 'utf8')

      await workspace.open(path.join(workdirPath1, 'a.txt'))
      await githubPackage.didChangeProjectPaths()
      assert.equal(githubPackage.getActiveRepository(), await githubPackage.repositoryForWorkdirPath(workdirPath1))
      assert.equal(githubPackage.commitPanelView.repository, githubPackage.getActiveRepository())

      project.setPaths([workdirPath2])
      await githubPackage.didChangeProjectPaths()
      assert.equal(githubPackage.getActiveRepository(), await githubPackage.repositoryForWorkdirPath(workdirPath2))
      assert.equal(githubPackage.commitPanelView.repository, githubPackage.getActiveRepository())
    })

    it('destroys all the repositories associated with the removed project folders', async () => {
      const workdirPath1 = copyRepositoryDir()
      const workdirPath2 = copyRepositoryDir()
      const workdirPath3 = copyRepositoryDir()
      project.setPaths([workdirPath1, workdirPath2, workdirPath3])

      const repository1 = await githubPackage.repositoryForWorkdirPath(workdirPath1)
      const repository2 = await githubPackage.repositoryForWorkdirPath(workdirPath2)
      const repository3 = await githubPackage.repositoryForWorkdirPath(workdirPath3)
      assert(repository1)
      assert(repository2)
      assert(repository3)

      project.removePath(workdirPath1)
      project.removePath(workdirPath3)
      githubPackage.didChangeProjectPaths()

      assert.notEqual(await githubPackage.repositoryForProjectDirectory(repository1.getWorkingDirectory()), repository1)
      assert.notEqual(await githubPackage.repositoryForProjectDirectory(repository3.getWorkingDirectory()), repository3)
      assert.equal(await githubPackage.repositoryForProjectDirectory(repository2.getWorkingDirectory()), repository2)
    })
  })

  describe('didChangeActivePaneItem', () => {
    it('updates the active repository', async () => {
      const workdirPath1 = copyRepositoryDir()
      const workdirPath2 = copyRepositoryDir()
      project.setPaths([workdirPath1, workdirPath2])
      fs.writeFileSync(path.join(workdirPath1, 'a.txt'), 'change 1', 'utf8')
      fs.writeFileSync(path.join(workdirPath2, 'b.txt'), 'change 2', 'utf8')

      await workspace.open(path.join(workdirPath1, 'a.txt'))
      await githubPackage.didChangeActivePaneItem()
      assert.equal(githubPackage.getActiveRepository(), await githubPackage.repositoryForWorkdirPath(workdirPath1))
      assert.equal(githubPackage.commitPanelView.repository, githubPackage.getActiveRepository())

      await workspace.open(path.join(workdirPath2, 'b.txt'))
      await githubPackage.didChangeActivePaneItem()
      assert.equal(githubPackage.getActiveRepository(), await githubPackage.repositoryForWorkdirPath(workdirPath2))
      assert.equal(githubPackage.commitPanelView.repository, githubPackage.getActiveRepository())
    })
  })

  describe('updateActiveRepository', () => {
    it('updates the active repository based on the most recent active item with a path unless its directory has been removed from the project', async () => {
      const workdirPath1 = copyRepositoryDir()
      const workdirPath2 = copyRepositoryDir()
      const nonRepositoryPath = temp.mkdirSync()
      fs.writeFileSync(path.join(nonRepositoryPath, 'c.txt'))
      project.setPaths([workdirPath1, workdirPath2, nonRepositoryPath])

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

      await workspace.open(path.join(nonRepositoryPath, 'c.txt'))
      await githubPackage.updateActiveRepository()
      assert.isNull(githubPackage.getActiveRepository())
    })

    it('subscribes to the file system changes, refreshing only the currently active repository', async function () {
      this.timeout(5000) // increase the timeout because we're interacting with file system events.

      const workdirPath1 = copyRepositoryDir()
      const workdirPath2 = copyRepositoryDir()
      project.setPaths([workdirPath1, workdirPath2])
      const repository1 = await githubPackage.repositoryForWorkdirPath(workdirPath1)
      const repository2 = await githubPackage.repositoryForWorkdirPath(workdirPath2)

      await workspace.open(path.join(workdirPath1, 'a.txt'))
      await githubPackage.updateActiveRepository()
      await workspace.open(path.join(workdirPath2, 'b.txt'))
      await githubPackage.updateActiveRepository()
      assert.equal((await repository1.refreshUnstagedChanges()).length, 0)
      assert.equal((await repository2.refreshUnstagedChanges()).length, 0)

      fs.writeFileSync(path.join(workdirPath1, 'a.txt'), 'a change\n')
      fs.writeFileSync(path.join(workdirPath2, 'a.txt'), 'a change\n')
      await githubPackage.lastFileChangePromise
      assert.equal((await repository1.getUnstagedChanges()).length, 0)
      assert.equal((await repository2.getUnstagedChanges()).length, 1)

      fs.writeFileSync(path.join(workdirPath1, 'b.txt'), 'a change\n')
      fs.writeFileSync(path.join(workdirPath2, 'b.txt'), 'a change\n')
      await githubPackage.lastFileChangePromise
      assert.equal((await repository1.getUnstagedChanges()).length, 0)
      assert.equal((await repository2.getUnstagedChanges()).length, 2)

      await workspace.open(path.join(workdirPath1, 'a.txt'))
      await githubPackage.updateActiveRepository()
      assert.equal((await repository1.refreshUnstagedChanges()).length, 2)
      assert.equal((await repository2.refreshUnstagedChanges()).length, 2)

      fs.writeFileSync(path.join(workdirPath1, 'c.txt'), 'a change\n')
      fs.writeFileSync(path.join(workdirPath2, 'c.txt'), 'a change\n')
      await githubPackage.lastFileChangePromise
      assert.equal((await repository1.getUnstagedChanges()).length, 3)
      assert.equal((await repository2.getUnstagedChanges()).length, 2)
    })
  })

  describe('when a FilePatch is selected in the staging panel', () => {
    it('shows a FilePatchView for the selected patch as a pane item', () => {
      let dummyActiveRepository = {}
      githubPackage.getActiveRepository = function () { return dummyActiveRepository }
      const filePatch1 = new FilePatch('a.txt', 'a.txt', 1234, 1234, 'modified', [])
      const filePatch2 = new FilePatch('b.txt', 'b.txt', 1234, 1234, 'modified', [])

      assert.isNull(githubPackage.filePatchView)

      githubPackage.commitPanelView.didSelectFilePatch(filePatch1, 'unstaged')
      assert(githubPackage.filePatchView)
      assert.equal(githubPackage.filePatchView.filePatch, filePatch1)
      assert.equal(githubPackage.filePatchView.repository, dummyActiveRepository)
      assert.equal(githubPackage.filePatchView.stagingStatus, 'unstaged')
      assert.equal(workspace.getActivePaneItem(), githubPackage.filePatchView)

      const existingFilePatchView = githubPackage.filePatchView
      workspace.getActivePane().splitRight() // activate a different pane
      assert.isUndefined(workspace.getActivePaneItem())

      dummyActiveRepository = {}
      githubPackage.commitPanelView.didSelectFilePatch(filePatch2, 'staged')
      assert.equal(githubPackage.filePatchView, existingFilePatchView)
      assert.equal(githubPackage.filePatchView.filePatch, filePatch2)
      assert.equal(githubPackage.filePatchView.repository, dummyActiveRepository)
      assert.equal(githubPackage.filePatchView.stagingStatus, 'staged')
      assert.equal(workspace.getActivePaneItem(), githubPackage.filePatchView)

      workspace.getActivePaneItem().destroy()
      assert.isUndefined(workspace.getActivePaneItem())
      assert.isNull(githubPackage.filePatchView)

      githubPackage.commitPanelView.didSelectFilePatch(filePatch2, 'staged')
      assert.notEqual(githubPackage.filePatchView, existingFilePatchView)
      assert.equal(githubPackage.filePatchView.filePatch, filePatch2)
      assert.equal(githubPackage.filePatchView.repository, dummyActiveRepository)
      assert.equal(githubPackage.filePatchView.stagingStatus, 'staged')
      assert.equal(workspace.getActivePaneItem(), githubPackage.filePatchView)
    })
  })
})
