/** @babel */

import fs from 'fs'
import path from 'path'

import etch from 'etch'
import sinon from 'sinon'

import {cloneRepository, buildRepository} from '../helpers'
import GitPanelController from '../../lib/controllers/git-panel-controller'

describe('GitPanelController', () => {
  let atomEnvironment, workspace, commandRegistry

  beforeEach(() => {
    atomEnvironment = global.buildAtomEnvironment()
    workspace = atomEnvironment.workspace
    commandRegistry = atomEnvironment.commands
  })

  afterEach(() => {
    atomEnvironment.destroy()
    atom.confirm.restore && atom.confirm.restore()
  })

  it('keeps the state of the GitPanelView in sync with the assigned repository', async (done) => {
    const workdirPath1 = await cloneRepository('three-files')
    const repository1 = await buildRepository(workdirPath1)
    const workdirPath2 = await cloneRepository('three-files')
    const repository2 = await buildRepository(workdirPath2)
    fs.writeFileSync(path.join(workdirPath1, 'a.txt'), 'a change\n')
    fs.unlinkSync(path.join(workdirPath1, 'b.txt'))
    const controller = new GitPanelController({workspace, commandRegistry, repository: repository1})

    // Does not render a GitPanelView until initial data is fetched
    assert.isUndefined(controller.refs.gitPanel)
    assert.isUndefined(controller.repository)
    await controller.lastModelDataRefreshPromise
    assert.isDefined(controller.repository)
    assert.equal(controller.refs.gitPanel.props.unstagedChanges, await repository1.getUnstagedChanges())

    // Fetches data when a new repository is assigned
    // Does not update repository instance variable until that data is fetched
    const updatePromise = controller.update({repository: repository2})
    assert.equal(controller.repository, repository1)
    assert.equal(controller.refs.gitPanel.props.unstagedChanges, await repository1.getUnstagedChanges())
    await updatePromise
    assert.equal(controller.repository, repository2)
    assert.equal(controller.refs.gitPanel.props.unstagedChanges, await repository2.getUnstagedChanges())

    // Fetches data and updates child view when the repository is mutated
    fs.writeFileSync(path.join(workdirPath2, 'a.txt'), 'a change\n')
    fs.unlinkSync(path.join(workdirPath2, 'b.txt'))
    await repository2.refresh()
    await controller.lastModelDataRefreshPromise
    assert.equal(controller.refs.gitPanel.props.unstagedChanges, await repository2.getUnstagedChanges())
  })

  it('displays the staged changes since the parent commmit when amending', async function () {
    const didChangeAmending = sinon.spy()
    const workdirPath = await cloneRepository('multiple-commits')
    const repository = await buildRepository(workdirPath)
    const controller = new GitPanelController({workspace, commandRegistry, repository, didChangeAmending})
    await controller.lastModelDataRefreshPromise
    assert.deepEqual(controller.refs.gitPanel.props.stagedChanges, [])
    assert.equal(didChangeAmending.callCount, 0)

    await controller.setAmending(true)
    assert.equal(didChangeAmending.callCount, 1)
    assert.deepEqual(
      controller.refs.gitPanel.props.stagedChanges,
      await controller.repository.getStagedChangesSinceParentCommit()
    )

    await controller.commit('Delete most of the code', {amend: true})
    await controller.lastModelDataRefreshPromise
    assert(!controller.refs.gitPanel.props.isAmending)
  })

  describe('integration tests', () => {
    it('can stage and unstage files and commit', async () => {
      const workdirPath = await cloneRepository('three-files')
      const repository = await buildRepository(workdirPath)
      fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'a change\n')
      fs.unlinkSync(path.join(workdirPath, 'b.txt'))
      const controller = new GitPanelController({workspace, commandRegistry, repository: repository})
      await controller.lastModelDataRefreshPromise
      const stagingView = controller.refs.gitPanel.refs.stagingView
      const commitView = controller.refs.gitPanel.refs.commitView

      assert.equal(stagingView.props.unstagedChanges.length, 2)
      assert.equal(stagingView.props.stagedChanges.length, 0)
      await stagingView.stageFilePatch(stagingView.props.unstagedChanges[0])
      await controller.lastModelDataRefreshPromise
      await stagingView.stageFilePatch(stagingView.props.unstagedChanges[0])
      await controller.lastModelDataRefreshPromise
      assert.equal(stagingView.props.unstagedChanges.length, 0)
      assert.equal(stagingView.props.stagedChanges.length, 2)
      await stagingView.unstageFilePatch(stagingView.props.stagedChanges[1])
      await controller.lastModelDataRefreshPromise
      assert.equal(stagingView.props.unstagedChanges.length, 1)
      assert.equal(stagingView.props.stagedChanges.length, 1)

      commitView.refs.editor.setText('Make it so')
      await commitView.commit()
      await controller.lastModelDataRefreshPromise

      assert.equal((await repository.getLastCommit()).message, 'Make it so')
    })

    it('can stage merge conflict files', async () => {
      const workdirPath = await cloneRepository('merge-conflict')
      const repository = await buildRepository(workdirPath)

      try {
        await repository.git.merge('origin/branch')
      } catch (e) {
        // expected
      }

      const controller = new GitPanelController({workspace, commandRegistry, repository: repository})
      await controller.lastModelDataRefreshPromise

      const stagingView = controller.refs.gitPanel.refs.stagingView
      assert.equal(stagingView.props.mergeConflicts.length, 5)
      assert.equal(stagingView.props.stagedChanges.length, 0)

      const conflict1 = stagingView.props.mergeConflicts.filter((c) => c.getPath() === 'modified-on-both-ours.txt')[0]
      const contentsWithMarkers = fs.readFileSync(path.join(workdirPath, conflict1.getPath()), 'utf8')
      assert(contentsWithMarkers.includes('>>>>>>>'))
      assert(contentsWithMarkers.includes('<<<<<<<'))

      let choice
      sinon.stub(atom, 'confirm', () => {
        return choice
      })

      // click Cancel
      choice = 1
      await stagingView.stageFilePatch(conflict1)
      await controller.lastModelDataRefreshPromise
      assert.equal(atom.confirm.calledOnce, true)
      assert.equal(stagingView.props.mergeConflicts.length, 5)
      assert.equal(stagingView.props.stagedChanges.length, 0)

      // click Stage
      choice = 0
      atom.confirm.reset()
      await stagingView.stageFilePatch(conflict1)
      await controller.lastModelDataRefreshPromise
      assert.equal(atom.confirm.calledOnce, true)
      assert.equal(stagingView.props.mergeConflicts.length, 4)
      assert.equal(stagingView.props.stagedChanges.length, 1)

      // clear merge markers
      const conflict2 = stagingView.props.mergeConflicts.filter((c) => c.getPath() === 'modified-on-both-theirs.txt')[0]
      atom.confirm.reset()
      fs.writeFileSync(path.join(workdirPath, conflict2.getPath()), 'text with no merge markers')
      await stagingView.stageFilePatch(conflict2)
      await controller.lastModelDataRefreshPromise
      assert.equal(atom.confirm.called, false)
      assert.equal(stagingView.props.mergeConflicts.length, 3)
      assert.equal(stagingView.props.stagedChanges.length, 2)
    })

    describe('checking out an existing branch', () => {
      it('can check out existing branches with no conflicts', async () => {
        const workdirPath = await cloneRepository('three-files')
        const repository = await buildRepository(workdirPath)

        await repository.git.exec(['branch', 'branch'])

        const controller = new GitPanelController({workspace, commandRegistry, repository})
        await controller.lastModelDataRefreshPromise

        const branchView = controller.refs.gitPanel.refs.branchView
        const {list} = branchView.refs

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
        await controller.lastModelDataRefreshPromise

        const branchView = controller.refs.gitPanel.refs.branchView
        const {list, message} = branchView.refs

        const branches = Array.from(list.options).map(option => option.value)
        assert.equal(await repository.getCurrentBranch(), 'branch')
        assert.equal(list.selectedOptions[0].value, 'branch')

        list.selectedIndex = branches.indexOf('master')
        list.onchange()
        await etch.getScheduler().getNextUpdatePromise()
        await controller.refreshModelData()
        assert.equal(await repository.getCurrentBranch(), 'branch')
        assert.equal(list.selectedOptions[0].value, 'branch')
        assert.match(message.innerHTML, /local changes.*would be overwritten/)
      })
    })

    describe('checking out newly created branches', () => {
      it('can check out newly created branches', async () => {
        const workdirPath = await cloneRepository('three-files')
        const repository = await buildRepository(workdirPath)

        const controller = new GitPanelController({workspace, commandRegistry, repository})
        await controller.lastModelDataRefreshPromise

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
        newBranchButton.click()
        await controller.refreshModelData(repository)
        // TODO: investigate possible etch bug. when the component unmounts the ref isn't removed
        // assert.isUndefined(branchView.refs.editor)
        assert.isDefined(branchView.refs.list)

        assert.equal(await repository.getCurrentBranch(), 'new-branch')
        assert.equal(controller.refs.gitPanel.refs.branchView.refs.list.selectedOptions[0].value, 'new-branch')
      })

      it('displays an error message if branch already exists', async () => {
        const workdirPath = await cloneRepository('three-files')
        const repository = await buildRepository(workdirPath)

        await repository.git.exec(['checkout', '-b', 'branch'])

        const controller = new GitPanelController({workspace, commandRegistry, repository})
        await controller.lastModelDataRefreshPromise

        const branchView = controller.refs.gitPanel.refs.branchView
        const {list, newBranchButton, message} = branchView.refs

        const branches = Array.from(branchView.refs.list.options).map(option => option.value)
        assert.deepEqual(branches, ['branch', 'master'])
        assert.equal(await repository.getCurrentBranch(), 'branch')
        assert.equal(list.selectedOptions[0].value, 'branch')

        newBranchButton.click()
        await etch.getScheduler().getNextUpdatePromise()

        branchView.refs.editor.setText('master')
        newBranchButton.click()
        await etch.getScheduler().getNextUpdatePromise()
        await controller.refreshModelData()
        assert.match(message.innerHTML, /branch.*already exists/)

        assert.equal(await repository.getCurrentBranch(), 'branch')
        assert.equal(branchView.refs.list.selectedOptions[0].value, 'branch')
      })
    })
  })
})
