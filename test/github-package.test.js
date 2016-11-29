/** @babel */

import fs from 'fs'
import path from 'path'
import temp from 'temp'
import etch from 'etch'
import sinon from 'sinon'
import {cloneRepository, buildRepository, until} from './helpers'
import FilePatch from '../lib/models/file-patch'
import GithubPackage from '../lib/github-package'

describe('GithubPackage', () => {
  let atomEnv, workspace, project, commandRegistry, viewRegistry, notificationManager, githubPackage

  beforeEach(async () => {
    atomEnv = global.buildAtomEnvironment()
    workspace = atomEnv.workspace
    project = atomEnv.project
    commandRegistry = atomEnv.commands
    viewRegistry = atomEnv.views
    notificationManager = atomEnv.notifications
    githubPackage = new GithubPackage(workspace, project, commandRegistry, notificationManager)
  })

  afterEach(() => {
    atomEnv.destroy()
  })

  describe('activate()', () => {
    it('updates the active repository', async () => {
      const workdirPath1 = await cloneRepository('three-files')
      const workdirPath2 = await cloneRepository('three-files')
      project.setPaths([workdirPath1, workdirPath2])
      fs.writeFileSync(path.join(workdirPath1, 'a.txt'), 'change 1', 'utf8')
      fs.writeFileSync(path.join(workdirPath1, 'b.txt'), 'change 2', 'utf8')

      await workspace.open(path.join(workdirPath1, 'a.txt'))
      await githubPackage.activate()
      assert.equal(githubPackage.getActiveRepository(), await githubPackage.repositoryForWorkdirPath(workdirPath1))
    })
  })

  describe('didChangeProjectPaths()', () => {
    it('updates the active repository', async () => {
      const workdirPath1 = await cloneRepository('three-files')
      const workdirPath2 = await cloneRepository('three-files')
      const nonRepositoryPath = temp.mkdirSync()
      fs.writeFileSync(path.join(nonRepositoryPath, 'c.txt'))
      project.setPaths([workdirPath1, workdirPath2, nonRepositoryPath])
      fs.writeFileSync(path.join(workdirPath1, 'a.txt'), 'change 1', 'utf8')

      sinon.spy(githubPackage, 'rerender')
      await workspace.open(path.join(workdirPath1, 'a.txt'))
      await githubPackage.didChangeProjectPaths()
      assert.equal(githubPackage.getActiveRepository(), await githubPackage.repositoryForWorkdirPath(workdirPath1))
      assert.equal(githubPackage.changeObserver.getActiveRepository(), githubPackage.getActiveRepository())
      assert.equal(githubPackage.rerender.callCount, 1)

      // Remove repository for open file
      project.setPaths([workdirPath2, nonRepositoryPath])
      await githubPackage.didChangeProjectPaths()
      assert.isNull(githubPackage.getActiveRepository())
      assert.isNull(githubPackage.changeObserver.getActiveRepository())
      assert.equal(githubPackage.rerender.callCount, 2)

      await workspace.open(path.join(workdirPath2, 'b.txt'))
      await githubPackage.didChangeProjectPaths()
      assert.equal(githubPackage.getActiveRepository(), await githubPackage.repositoryForWorkdirPath(workdirPath2))
      assert.equal(githubPackage.changeObserver.getActiveRepository(), githubPackage.getActiveRepository())
      assert.equal(githubPackage.rerender.callCount, 3)

      await workspace.open(path.join(nonRepositoryPath, 'c.txt'))
      await githubPackage.didChangeProjectPaths()
      assert.isNull(githubPackage.getActiveRepository())
      assert.isNull(githubPackage.changeObserver.getActiveRepository())
      assert.equal(githubPackage.rerender.callCount, 4)
    })

    it('destroys all the repositories associated with the removed project folders', async () => {
      const workdirPath1 = await cloneRepository('three-files')
      const workdirPath2 = await cloneRepository('three-files')
      const workdirPath3 = await cloneRepository('three-files')
      project.setPaths([workdirPath1, workdirPath2, workdirPath3])

      const repository1 = await githubPackage.repositoryForWorkdirPath(workdirPath1)
      const repository2 = await githubPackage.repositoryForWorkdirPath(workdirPath2)
      const repository3 = await githubPackage.repositoryForWorkdirPath(workdirPath3)
      assert(repository1)
      assert(repository2)
      assert(repository3)

      project.removePath(workdirPath1)
      project.removePath(workdirPath3)
      await githubPackage.didChangeProjectPaths()

      assert.notEqual(await githubPackage.repositoryForProjectDirectory(repository1.getWorkingDirectory()), repository1)
      assert.notEqual(await githubPackage.repositoryForProjectDirectory(repository3.getWorkingDirectory()), repository3)
      assert.equal(await githubPackage.repositoryForProjectDirectory(repository2.getWorkingDirectory()), repository2)
    })
  })

  describe('didChangeActivePaneItem()', () => {
    it('updates the active repository', async () => {
      const workdirPath1 = await cloneRepository('three-files')
      const workdirPath2 = await cloneRepository('three-files')
      project.setPaths([workdirPath1, workdirPath2])
      fs.writeFileSync(path.join(workdirPath1, 'a.txt'), 'change 1', 'utf8')
      fs.writeFileSync(path.join(workdirPath2, 'b.txt'), 'change 2', 'utf8')

      await workspace.open(path.join(workdirPath1, 'a.txt'))
      await githubPackage.didChangeActivePaneItem()
      assert.equal(githubPackage.getActiveRepository(), await githubPackage.repositoryForWorkdirPath(workdirPath1))

      await workspace.open(path.join(workdirPath2, 'b.txt'))
      await githubPackage.didChangeActivePaneItem()
      assert.equal(githubPackage.getActiveRepository(), await githubPackage.repositoryForWorkdirPath(workdirPath2))
    })
  })

  describe('updateActiveRepository()', () => {
    it('updates the active repository based on the active item, setting it to null when the active item is not in a project repository', async () => {
      const workdirPath1 = await cloneRepository('three-files')
      const workdirPath2 = await cloneRepository('three-files')
      const nonRepositoryPath = temp.mkdirSync()
      fs.writeFileSync(path.join(nonRepositoryPath, 'c.txt'))
      project.setPaths([workdirPath1, workdirPath2, nonRepositoryPath])

      await workspace.open(path.join(workdirPath1, 'a.txt'))
      await workspace.open(path.join(workdirPath2, 'b.txt'))

      await githubPackage.updateActiveRepository()
      assert.equal(githubPackage.getActiveRepository(), await githubPackage.repositoryForWorkdirPath(workdirPath2))

      await workspace.open(path.join(nonRepositoryPath, 'c.txt'))
      await githubPackage.updateActiveRepository()
      assert.isNull(githubPackage.getActiveRepository())

      await workspace.open(path.join(workdirPath1, 'a.txt'))
      await githubPackage.updateActiveRepository()
      assert.equal(githubPackage.getActiveRepository(), await githubPackage.repositoryForWorkdirPath(workdirPath1))

      workspace.getActivePane().activateItem({}) // such as when find & replace results pane is focused
      await githubPackage.updateActiveRepository()
      assert.equal(githubPackage.getActiveRepository(), await githubPackage.repositoryForWorkdirPath(workdirPath1))

      await workspace.open(path.join(workdirPath2, 'b.txt'))
      await githubPackage.updateActiveRepository()
      assert.equal(githubPackage.getActiveRepository(), await githubPackage.repositoryForWorkdirPath(workdirPath2))

      project.removePath(workdirPath2)
      await githubPackage.updateActiveRepository()
      assert.isNull(githubPackage.getActiveRepository())

      project.removePath(workdirPath1)
      await githubPackage.updateActiveRepository()
      assert.isNull(githubPackage.getActiveRepository())

      await workspace.open(path.join(workdirPath1, 'a.txt'))
      await githubPackage.updateActiveRepository()
      assert.isNull(githubPackage.getActiveRepository())
    })
  })

  // TODO: move into GitController tests
  // describe('showMergeConflictFileForPath(filePath)', () => {
  //   it('opens the file as a pane item if it exsits', async () => {
  //     const workdirPath = await cloneRepository('merge-conflict')
  //     const repository = await buildRepository(workdirPath)
  //     githubPackage.getActiveRepository = function () { return repository }
  //     await githubPackage.gitPanelController.props.didSelectMergeConflictFile('added-to-both.txt')
  //     assert.equal(workspace.getActivePaneItem().getPath(), path.join(workdirPath, 'added-to-both.txt'))
  //   })
  //
  //   describe('when the file doesn\'t exist', () => {
  //     it('shows an info notification and does not open the file', async () => {
  //       const workdirPath = await cloneRepository('merge-conflict')
  //       const repository = await buildRepository(workdirPath)
  //       githubPackage.getActiveRepository = function () { return repository }
  //       fs.unlinkSync(path.join(workdirPath, 'added-to-both.txt'))
  //
  //       assert.equal(notificationManager.getNotifications().length, 0)
  //       await githubPackage.gitPanelController.props.didSelectMergeConflictFile('added-to-both.txt')
  //       assert.isUndefined(workspace.getActivePaneItem())
  //       assert.equal(notificationManager.getNotifications().length, 1)
  //     })
  //   })
  // })

  // TODO: move into GitController tests
  // describe('showFilePatchForPath(filePath, staged, {amending, activate})', () => {
  //   describe('when a file is selected in the staging panel', () => {
  //     it('shows a FilePatchView for the selected file as a pane item, always updating the existing pane item', async () => {
  //       const workdirPath = await cloneRepository('three-files')
  //       const repository = await buildRepository(workdirPath)
  //
  //       fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'change', 'utf8')
  //       fs.writeFileSync(path.join(workdirPath, 'd.txt'), 'new-file', 'utf8')
  //       await repository.stageFiles(['d.txt'])
  //
  //       githubPackage.getActiveRepository = function () { return repository }
  //
  //       assert.isNull(githubPackage.filePatchController)
  //
  //       await githubPackage.showFilePatchForPath('a.txt', 'unstaged', {activate: true})
  //       assert(githubPackage.filePatchController)
  //       assert.equal(githubPackage.filePatchController.props.filePatch.getPath(), 'a.txt')
  //       assert.equal(githubPackage.filePatchController.props.repository, repository)
  //       assert.equal(githubPackage.filePatchController.props.stagingStatus, 'unstaged')
  //       assert.equal(workspace.getActivePaneItem(), githubPackage.filePatchController)
  //
  //       const existingFilePatchView = githubPackage.filePatchController
  //       const originalPane = workspace.getActivePane()
  //       originalPane.splitRight() // activate a different pane
  //       assert.isUndefined(workspace.getActivePaneItem())
  //
  //       await githubPackage.showFilePatchForPath('d.txt', 'staged')
  //       assert.equal(githubPackage.filePatchController, existingFilePatchView)
  //       assert.equal(githubPackage.filePatchController.props.filePatch.getPath(), 'd.txt')
  //       assert.equal(githubPackage.filePatchController.props.repository, repository)
  //       assert.equal(githubPackage.filePatchController.props.stagingStatus, 'staged')
  //       assert.equal(originalPane.getActiveItem(), githubPackage.filePatchController)
  //
  //       originalPane.getActiveItem().destroy()
  //       assert.isUndefined(workspace.getActivePaneItem())
  //       assert.isNull(githubPackage.filePatchController)
  //
  //       await githubPackage.showFilePatchForPath('d.txt', 'staged', {activate: true})
  //       assert.notEqual(githubPackage.filePatchController, existingFilePatchView)
  //       assert.equal(githubPackage.filePatchController.props.filePatch.getPath(), 'd.txt')
  //       assert.equal(githubPackage.filePatchController.props.repository, repository)
  //       assert.equal(githubPackage.filePatchController.props.stagingStatus, 'staged')
  //       assert.equal(workspace.getActivePaneItem(), githubPackage.filePatchController)
  //     })
  //   })

    // TODO: Move into GitController tests
  //   describe('when there is a change to the repo', () => {
  //     it('updates the FilePatchController with the correct filePatch', async () => {
  //       const workdirPath = await cloneRepository('multiple-commits')
  //       const repository = await buildRepository(workdirPath)
  //
  //       githubPackage.getActiveRepository = function () { return repository }
  //       fs.writeFileSync(path.join(workdirPath, 'file.txt'), 'change', 'utf8')
  //       await githubPackage.showFilePatchForPath('file.txt', 'unstaged', {activate: true})
  //
  //       let filePatchController = githubPackage.filePatchController
  //       sinon.spy(filePatchController, 'update')
  //
  //       // udpate unstaged file patch
  //       fs.writeFileSync(path.join(workdirPath, 'file.txt'), 'change\nplus more changes', 'utf8')
  //       await repository.refresh()
  //       // repository refresh causes async actions so waiting for this is the best way to determine the update has finished
  //       await etch.getScheduler().getNextUpdatePromise()
  //       const unstagedFilePatch = await repository.getFilePatchForPath('file.txt')
  //       assert.deepEqual(filePatchController.update.lastCall.args[0].filePatch, unstagedFilePatch)
  //
  //       // update staged file patch
  //       await repository.stageFiles(['file.txt'])
  //       await githubPackage.showFilePatchForPath('file.txt', 'staged', {activate: true})
  //       fs.writeFileSync(path.join(workdirPath, 'file.txt'), 'change\nplus more changes\nand more!', 'utf8')
  //       await repository.stageFiles(['file.txt'])
  //       await repository.refresh()
  //       // repository refresh causes async actions so waiting for this is the best way to determine the update has finished
  //       await etch.getScheduler().getNextUpdatePromise()
  //       const stagedFilePatch = await repository.getFilePatchForPath('file.txt', {staged: true})
  //       assert.deepEqual(filePatchController.update.lastCall.args[0].filePatch, stagedFilePatch)
  //
  //       // update amended file patch
  //       // didChangeAmending destroys current filePatchController
  //       githubPackage.gitPanelController.props.didChangeAmending()
  //       await githubPackage.showFilePatchForPath('file.txt', 'staged', {activate: true, amending: true})
  //       filePatchController = githubPackage.filePatchController
  //       sinon.spy(filePatchController, 'update')
  //       fs.writeFileSync(path.join(workdirPath, 'file.txt'), 'change file being amended', 'utf8')
  //       await repository.stageFiles(['file.txt'])
  //       await repository.refresh()
  //       // repository refresh causes async actions so waiting for this is the best way to determine the update has finished
  //       await etch.getScheduler().getNextUpdatePromise()
  //       const amendedStagedFilePatch = await repository.getFilePatchForPath('file.txt', {staged: true, amending: true})
  //       assert.deepEqual(filePatchController.update.lastCall.args[0].filePatch, amendedStagedFilePatch)
  //     })
  //   })
  // })

  // TODO: Move into GitController tests
  // describe('when amend mode is toggled in the staging panel while viewing a staged change', () => {
  //   it('closes the file patch pane item', async () => {
  //     const workdirPath = await cloneRepository('three-files')
  //     const repository = await buildRepository(workdirPath)
  //     fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'change', 'utf8')
  //     await repository.stageFiles(['a.txt'])
  //
  //     githubPackage.getActiveRepository = function () { return repository }
  //
  //     await githubPackage.showFilePatchForPath('a.txt', 'staged', {activate: true})
  //     assert.isOk(githubPackage.filePatchController)
  //     assert.equal(workspace.getActivePaneItem(), githubPackage.filePatchController)
  //
  //     githubPackage.gitPanelController.props.didChangeAmending()
  //     assert.isNull(githubPackage.filePatchController)
  //     assert.isUndefined(workspace.getActivePaneItem())
  //   })
  // })
  //
  // describe('when the changed files label in the status bar is clicked', () => {
  //   it('toggles the git panel', async () => {
  //     const workdirPath = await cloneRepository('three-files')
  //     project.setPaths([workdirPath])
  //     await workspace.open(path.join(workdirPath, 'a.txt'))
  //     await githubPackage.updateActiveRepository()
  //
  //     githubPackage.statusBarTileController.refs.changedFilesCountView.props.didClick()
  //     assert.equal(workspace.getRightPanels().length, 1)
  //
  //     githubPackage.statusBarTileController.refs.changedFilesCountView.props.didClick()
  //     assert.equal(workspace.getRightPanels().length, 0)
  //
  //     githubPackage.statusBarTileController.refs.changedFilesCountView.props.didClick()
  //     assert.equal(workspace.getRightPanels().length, 1)
  //   })
  // })

  describe('toggleGitPanel()', () => {
    it('shows-and-focuses or hides the git panel', async () => {
      sinon.stub(githubPackage, 'rerender')
      const workdirPath = await cloneRepository('three-files')
      project.setPaths([workdirPath])
      await workspace.open(path.join(workdirPath, 'a.txt'))
      await githubPackage.activate()

      githubPackage.rerender.reset()
      assert.isFalse(githubPackage.gitPanelActive)
      githubPackage.toggleGitPanel()
      assert.isTrue(githubPackage.gitPanelActive)
      assert.equal(githubPackage.rerender.callCount, 1)
      // TODO: fix this
      // assert(githubPackage.gitPanelController.refs.gitPanel.refs.stagingView.isFocused())
      githubPackage.toggleGitPanel()
      assert.isFalse(githubPackage.gitPanelActive)
      assert.equal(githubPackage.rerender.callCount, 2)
    })
  })

  // TODO: fix
  // describe('focusGitPanel()', () => {
  //   it('shows-and-focuses the git panel', async () => {
  //     const workspaceElement = viewRegistry.getView(workspace)
  //     document.body.appendChild(workspaceElement)
  //     const workdirPath = await cloneRepository('three-files')
  //     project.setPaths([workdirPath])
  //     await workspace.open(path.join(workdirPath, 'a.txt'))
  //     await githubPackage.activate()
  //
  //     assert.equal(workspace.getRightPanels().length, 0)
  //     githubPackage.focusGitPanel()
  //     assert.equal(workspace.getRightPanels().length, 1)
  //     assert.equal(workspace.getRightPanels()[0].item, githubPackage.gitPanelController)
  //     assert(githubPackage.gitPanelController.refs.gitPanel.refs.stagingView.isFocused())
  //
  //     githubPackage.toggleGitPanel()
  //     assert.equal(workspace.getRightPanels().length, 0)
  //
  //     githubPackage.focusGitPanel()
  //     assert.equal(workspace.getRightPanels().length, 1)
  //     assert.equal(workspace.getRightPanels()[0].item, githubPackage.gitPanelController)
  //     assert(githubPackage.gitPanelController.refs.gitPanel.refs.stagingView.isFocused())
  //
  //     workspaceElement.remove()
  //   })
  // })
})
