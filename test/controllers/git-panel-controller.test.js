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

  xit('displays loading message in GitPanelView while data is being fetched', async () => {
    // TODO: implement me
  })

  it('keeps the state of the GitPanelView in sync with the assigned repository', async (done) => {
    const workdirPath1 = await cloneRepository('three-files')
    const repository1 = await buildRepository(workdirPath1)
    const workdirPath2 = await cloneRepository('three-files')
    const repository2 = await buildRepository(workdirPath2)
    fs.writeFileSync(path.join(workdirPath1, 'a.txt'), 'a change\n')
    fs.unlinkSync(path.join(workdirPath1, 'b.txt'))
    const controller = new GitPanelController({workspace, commandRegistry, repository: null})

    // Renders empty GitPanelView when there is no active repository
    assert.isDefined(controller.refs.gitPanel)
    assert.isNull(controller.getActiveRepository())
    assert.isDefined(controller.refs.gitPanel.refs.noRepoMessage)

    // Fetches data when a new repository is assigned
    // Does not update repository instance variable until that data is fetched
    await controller.update({repository: repository1})
    assert.equal(controller.getActiveRepository(), repository1)
    assert.equal(controller.refs.gitPanel.props.unstagedChanges, await repository1.getUnstagedChanges())

    await controller.update({repository: repository2})
    assert.equal(controller.getActiveRepository(), repository2)
    assert.equal(controller.refs.gitPanel.props.unstagedChanges, await repository2.getUnstagedChanges())

    // Fetches data and updates child view when the repository is mutated
    fs.writeFileSync(path.join(workdirPath2, 'a.txt'), 'a change\n')
    fs.unlinkSync(path.join(workdirPath2, 'b.txt'))
    await repository2.refresh()
    await controller.getLastModelDataRefreshPromise()
    assert.equal(controller.refs.gitPanel.props.unstagedChanges, await repository2.getUnstagedChanges())
  })

  it('displays the staged changes since the parent commmit when amending', async function () {
    const didChangeAmending = sinon.spy()
    const workdirPath = await cloneRepository('multiple-commits')
    const repository = await buildRepository(workdirPath)
    const controller = new GitPanelController({workspace, commandRegistry, repository, didChangeAmending})
    await controller.getLastModelDataRefreshPromise()
    assert.deepEqual(controller.refs.gitPanel.props.stagedChanges, [])
    assert.equal(didChangeAmending.callCount, 0)

    await controller.setAmending(true)
    assert.equal(didChangeAmending.callCount, 1)
    assert.deepEqual(
      controller.refs.gitPanel.props.stagedChanges,
      await controller.getActiveRepository().getStagedChangesSinceParentCommit()
    )

    await controller.commit('Delete most of the code', {amend: true})
    await controller.getLastModelDataRefreshPromise()
    assert(!controller.refs.gitPanel.props.isAmending)
  })

  describe('integration tests', () => {
    it('can stage and unstage files and commit', async () => {
      const workdirPath = await cloneRepository('three-files')
      const repository = await buildRepository(workdirPath)
      fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'a change\n')
      fs.unlinkSync(path.join(workdirPath, 'b.txt'))
      const controller = new GitPanelController({workspace, commandRegistry, repository: repository})
      await controller.getLastModelDataRefreshPromise()
      const stagingView = controller.refs.gitPanel.refs.stagingView
      const commitView = controller.refs.gitPanel.refs.commitView

      assert.equal(stagingView.props.unstagedChanges.length, 2)
      assert.equal(stagingView.props.stagedChanges.length, 0)
      await stagingView.stageFilePatch(stagingView.props.unstagedChanges[0])
      await controller.getLastModelDataRefreshPromise()
      await stagingView.stageFilePatch(stagingView.props.unstagedChanges[0])
      await controller.getLastModelDataRefreshPromise()
      assert.equal(stagingView.props.unstagedChanges.length, 0)
      assert.equal(stagingView.props.stagedChanges.length, 2)
      await stagingView.unstageFilePatch(stagingView.props.stagedChanges[1])
      await controller.getLastModelDataRefreshPromise()
      assert.equal(stagingView.props.unstagedChanges.length, 1)
      assert.equal(stagingView.props.stagedChanges.length, 1)

      commitView.refs.editor.setText('Make it so')
      await commitView.commit()
      await controller.getLastModelDataRefreshPromise()

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
      await controller.getLastModelDataRefreshPromise()

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
      await controller.getLastModelDataRefreshPromise()
      assert.equal(atom.confirm.calledOnce, true)
      assert.equal(stagingView.props.mergeConflicts.length, 5)
      assert.equal(stagingView.props.stagedChanges.length, 0)

      // click Stage
      choice = 0
      atom.confirm.reset()
      await stagingView.stageFilePatch(conflict1)
      await controller.getLastModelDataRefreshPromise()
      assert.equal(atom.confirm.calledOnce, true)
      assert.equal(stagingView.props.mergeConflicts.length, 4)
      assert.equal(stagingView.props.stagedChanges.length, 1)

      // clear merge markers
      const conflict2 = stagingView.props.mergeConflicts.filter((c) => c.getPath() === 'modified-on-both-theirs.txt')[0]
      atom.confirm.reset()
      fs.writeFileSync(path.join(workdirPath, conflict2.getPath()), 'text with no merge markers')
      await stagingView.stageFilePatch(conflict2)
      await controller.getLastModelDataRefreshPromise()
      assert.equal(atom.confirm.called, false)
      assert.equal(stagingView.props.mergeConflicts.length, 3)
      assert.equal(stagingView.props.stagedChanges.length, 2)
    })
  })
})
