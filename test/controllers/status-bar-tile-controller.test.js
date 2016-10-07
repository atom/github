/** @babel */

import fs from 'fs'
import path from 'path'

import etch from 'etch'
import sinon from 'sinon'

import {cloneRepository, buildRepository, setUpLocalAndRemoteRepositories} from '../helpers'
import StatusBarTileController from '../../lib/controllers/status-bar-tile-controller'

describe('StatusBarTileController', () => {
  let atomEnvironment, workspace

  beforeEach(() => {
    atomEnvironment = global.buildAtomEnvironment()
    workspace = atomEnvironment.workspace
  })

  afterEach(() => {
    atomEnvironment.destroy()
  })

  describe('branches', function () {
    it('indicates the current branch and toggles visibility of the branch menu when clicked', async function () {
      const workdirPath = await cloneRepository('three-files')
      const repository = await buildRepository(workdirPath)

      const controller = new StatusBarTileController({workspace, repository})
      await controller.getLastModelDataRefreshPromise()

      const branchView = controller.refs.branchView
      assert.equal(branchView.element.textContent, 'master')

      assert.isUndefined(document.querySelectorAll('.git-BranchMenuView')[0])
      branchView.element.onclick()
      assert.isDefined(document.querySelectorAll('.git-BranchMenuView')[0])
      branchView.element.onclick()
      assert.isUndefined(document.querySelectorAll('.git-BranchMenuView')[0])
    })

    describe('the branch menu', function () {
      describe('checking out an existing branch', () => {
        it('can check out existing branches with no conflicts', async () => {
          const workdirPath = await cloneRepository('three-files')
          const repository = await buildRepository(workdirPath)

          // create branch called 'branch'
          await repository.git.exec(['branch', 'branch'])

          const controller = new StatusBarTileController({workspace, repository})
          await controller.getLastModelDataRefreshPromise()

          const branchMenuView = controller.branchMenuView
          const {list} = branchMenuView.refs

          const branches = Array.from(list.options).map(option => option.value)
          assert.deepEqual(branches, ['branch', 'master'])
          assert.equal(await repository.getCurrentBranch(), 'master')
          assert.equal(list.selectedOptions[0].value, 'master')

          list.selectedIndex = branches.indexOf('branch')
          list.onchange()
          assert.equal(await repository.getCurrentBranch(), 'branch')
          assert.equal(list.selectedOptions[0].value, 'branch')

          list.selectedIndex = branches.indexOf('master')
          list.onchange()
          assert.equal(await repository.getCurrentBranch(), 'master')
          assert.equal(list.selectedOptions[0].value, 'master')
        })

        it('displays an error message if checkout fails', async () => {
          const {localRepoPath} = await setUpLocalAndRemoteRepositories('three-files')
          const repository = await buildRepository(localRepoPath)
          await repository.git.exec(['branch', 'branch'])

          // create a conflict
          fs.writeFileSync(path.join(localRepoPath, 'a.txt'), 'a change')

          await repository.git.exec(['commit', '-a', '-m', 'change on master'])
          await repository.checkout('branch')
          fs.writeFileSync(path.join(localRepoPath, 'a.txt'), 'a change that conflicts')

          const controller = new StatusBarTileController({workspace, repository})
          await controller.getLastModelDataRefreshPromise()

          const branchMenuView = controller.branchMenuView
          const {list, message} = branchMenuView.refs

          const branches = Array.from(list.options).map(option => option.value)
          assert.equal(await repository.getCurrentBranch(), 'branch')
          assert.equal(list.selectedOptions[0].value, 'branch')

          list.selectedIndex = branches.indexOf('master')
          list.onchange()
          await etch.getScheduler().getNextUpdatePromise()
          assert.equal(await repository.getCurrentBranch(), 'branch')
          assert.equal(list.selectedOptions[0].value, 'branch')
          assert.match(message.innerHTML, /local changes.*would be overwritten/)
        })
      })

      describe('checking out newly created branches', () => {
        it('can check out newly created branches', async () => {
          const workdirPath = await cloneRepository('three-files')
          const repository = await buildRepository(workdirPath)

          const controller = new StatusBarTileController({workspace, repository})
          await controller.getLastModelDataRefreshPromise()

          const branchMenuView = controller.branchMenuView
          const {list, newBranchButton} = branchMenuView.refs

          const branches = Array.from(list.options).map(option => option.value)
          assert.deepEqual(branches, ['master'])
          assert.equal(await repository.getCurrentBranch(), 'master')
          assert.equal(list.selectedOptions[0].value, 'master')

          assert.isDefined(branchMenuView.refs.list)
          assert.isUndefined(branchMenuView.refs.editor)
          newBranchButton.click()
          await etch.getScheduler().getNextUpdatePromise()
          assert.isUndefined(branchMenuView.refs.list)
          assert.isDefined(branchMenuView.refs.editor)

          branchMenuView.refs.editor.setText('new-branch')
          await newBranchButton.onclick()
          await controller.getLastModelDataRefreshPromise()

          assert.isUndefined(branchMenuView.refs.editor)
          assert.isDefined(branchMenuView.refs.list)

          assert.equal(await repository.getCurrentBranch(), 'new-branch')
          assert.equal(branchMenuView.refs.list.selectedOptions[0].value, 'new-branch')
        })

        it('displays an error message if branch already exists', async () => {
          const workdirPath = await cloneRepository('three-files')
          const repository = await buildRepository(workdirPath)

          await repository.git.exec(['checkout', '-b', 'branch'])

          const controller = new StatusBarTileController({workspace, repository})
          await controller.getLastModelDataRefreshPromise()

          const branchMenuView = controller.branchMenuView
          const {list, newBranchButton, message} = branchMenuView.refs

          const branches = Array.from(branchMenuView.refs.list.options).map(option => option.value)
          assert.deepEqual(branches, ['branch', 'master'])
          assert.equal(await repository.getCurrentBranch(), 'branch')
          assert.equal(list.selectedOptions[0].value, 'branch')

          await newBranchButton.onclick()

          branchMenuView.refs.editor.setText('master')
          await newBranchButton.onclick()
          assert.match(message.innerHTML, /branch.*already exists/)

          assert.equal(await repository.getCurrentBranch(), 'branch')
          assert.equal(branchMenuView.refs.list.selectedOptions[0].value, 'branch')
        })
      })
    })
  })

  describe('changed files', function () {
    it('shows the changed files count view when the repository data is loaded', async () => {
      const workdirPath = await cloneRepository('three-files')
      const repository = await buildRepository(workdirPath)

      const toggleGitPanel = sinon.spy()
      const controller = new StatusBarTileController({workspace, repository, toggleGitPanel})
      await controller.getLastModelDataRefreshPromise()

      const changedFilesCountView = controller.refs.changedFilesCountView

      assert.equal(changedFilesCountView.element.textContent, '')

      fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'a change\n')
      fs.unlinkSync(path.join(workdirPath, 'b.txt'))
      repository.refresh()
      const [patchToStage] = await repository.getUnstagedChanges()
      await repository.applyPatchToIndex(patchToStage)
      await controller.getLastModelDataRefreshPromise()

      assert.equal(changedFilesCountView.element.textContent, '2 files')

      changedFilesCountView.element.click()
      assert(toggleGitPanel.calledOnce)
    })
  })
})
