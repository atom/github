/** @babel */

import fs from 'fs'
import path from 'path'

import etch from 'etch'
import sinon from 'sinon'

import {cloneRepository, buildRepository} from '../helpers'
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
    it('indicates the current branch', async function () {
      const workdirPath = await cloneRepository('three-files')
      const repository = await buildRepository(workdirPath)

      const controller = new StatusBarTileController({workspace, repository})
      await controller.getLastModelDataRefreshPromise()

      const branchView = controller.refs.branchView
      assert.equal(branchView.element.textContent, 'master')
    })

    describe('the branch menu', function () {
      describe('checking out an existing branch', () => {
        it.only('can check out existing branches with no conflicts', async () => {
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
          const workdirPath = await cloneRepository('three-files')
          const repository = await buildRepository(workdirPath)
          await repository.git.exec(['branch', 'branch'])

          // create a conflict
          fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'a change')
          await repository.git.exec(['commit', '-a', '-m', 'change on master'])
          await repository.checkout('branch')
          fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'a change that conflicts')

          const controller = new GitPanelController({workspace, commandRegistry, repository})
          await controller.getLastModelDataRefreshPromise()

          const branchView = controller.refs.gitPanel.refs.branchView
          const {list, message} = branchView.refs

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

      xdescribe('checking out newly created branches', () => {
        it('can check out newly created branches', async () => {
          const workdirPath = await cloneRepository('three-files')
          const repository = await buildRepository(workdirPath)

          const controller = new GitPanelController({workspace, commandRegistry, repository})
          await controller.getLastModelDataRefreshPromise()

          let branchView = controller.refs.gitPanel.refs.branchView
          const {list, newBranchButton} = branchView.refs

          const branches = Array.from(list.options).map(option => option.value)
          assert.deepEqual(branches, ['master'])
          assert.equal(await repository.getCurrentBranch(), 'master')
          assert.equal(list.selectedOptions[0].value, 'master')

          assert.isDefined(branchView.refs.list)
          assert.isUndefined(branchView.refs.editor)
          newBranchButton.click()
          await etch.getScheduler().getNextUpdatePromise()
          assert.isUndefined(branchView.refs.list)
          assert.isDefined(branchView.refs.editor)

          branchView.refs.editor.setText('new-branch')
          await newBranchButton.onclick()
          await controller.getLastModelDataRefreshPromise()

          assert.isUndefined(branchView.refs.editor)
          assert.isDefined(branchView.refs.list)

          assert.equal(await repository.getCurrentBranch(), 'new-branch')
          assert.equal(controller.refs.gitPanel.refs.branchView.refs.list.selectedOptions[0].value, 'new-branch')
        })

        it('displays an error message if branch already exists', async () => {
          const workdirPath = await cloneRepository('three-files')
          const repository = await buildRepository(workdirPath)

          await repository.git.exec(['checkout', '-b', 'branch'])

          const controller = new GitPanelController({workspace, commandRegistry, repository})
          await controller.getLastModelDataRefreshPromise()

          const branchView = controller.refs.gitPanel.refs.branchView
          const {list, newBranchButton, message} = branchView.refs

          const branches = Array.from(branchView.refs.list.options).map(option => option.value)
          assert.deepEqual(branches, ['branch', 'master'])
          assert.equal(await repository.getCurrentBranch(), 'branch')
          assert.equal(list.selectedOptions[0].value, 'branch')

          await newBranchButton.onclick()

          branchView.refs.editor.setText('master')
          await newBranchButton.onclick()
          assert.match(message.innerHTML, /branch.*already exists/)

          assert.equal(await repository.getCurrentBranch(), 'branch')
          assert.equal(branchView.refs.list.selectedOptions[0].value, 'branch')
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
