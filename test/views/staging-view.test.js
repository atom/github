/** @babel */

import {copyRepositoryDir, buildRepository} from '../helpers'
import path from 'path'
import fs from 'fs'
import sinon from 'sinon'

import StagingView, {ListTypes} from '../../lib/views/staging-view'

const getSelectedItemForStagedList = (view) => {
  return view.multiList.getSelectedItemForList(1)
}

const getSelectedItemForUnstagedList = (view) => {
  return view.multiList.getSelectedItemForList(0)
}

describe('StagingView', () => {
  describe('staging and unstaging files', () => {
    it('renders staged and unstaged files', async () => {
      const workdirPath = await copyRepositoryDir(1)
      const repository = await buildRepository(workdirPath)
      fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'a change\n')
      fs.unlinkSync(path.join(workdirPath, 'b.txt'))
      const filePatches = await repository.getUnstagedChanges()
      const view = new StagingView({repository, stagedChanges: [], unstagedChanges: filePatches})
      const {stagedChangesView, unstagedChangesView} = view.refs
      assert.deepEqual(stagedChangesView.filePatches, [])
      assert.deepEqual(unstagedChangesView.filePatches, filePatches)

      await view.update({repository, stagedChanges: [filePatches[1]], unstagedChanges: [filePatches[0]]})
      assert.deepEqual(stagedChangesView.filePatches, [filePatches[1]])
      assert.deepEqual(unstagedChangesView.filePatches, [filePatches[0]])

      await view.update({repository, stagedChanges: [], unstagedChanges: filePatches})
      assert.deepEqual(stagedChangesView.filePatches, [])
      assert.deepEqual(unstagedChangesView.filePatches, filePatches)
    })

    describe('didConfirmSelectedFilePatch()', () => {
      it('stages and unstages files', async () => {
        const workdirPath = await copyRepositoryDir(1)
        const repository = await buildRepository(workdirPath)
        fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'a change\n')
        fs.unlinkSync(path.join(workdirPath, 'b.txt'))
        const filePatches = await repository.getUnstagedChanges()
        const view = new StagingView({repository, stagedChanges: [], unstagedChanges: filePatches})
        const {stagedChangesView, unstagedChangesView} = view.refs

        unstagedChangesView.didSelectFilePatch(filePatches[1])
        await view.didConfirmSelectedFilePatch()
        await view.update({repository, stagedChanges: [filePatches[1]], unstagedChanges: [filePatches[0]]})
        assert.deepEqual(await repository.getStagedChanges(), [filePatches[1]])
        assert.deepEqual(await repository.getUnstagedChanges(), [filePatches[0]])

        stagedChangesView.didSelectFilePatch(filePatches[1])
        await view.didConfirmSelectedFilePatch()
        await view.update({repository, stagedChanges: [], unstagedChanges: filePatches})
        assert.deepEqual(await repository.getStagedChanges(), [])
        assert.deepEqual(await repository.getUnstagedChanges(), filePatches)
      })
    })
  })

  describe('focusing lists', () => {
    describe('when lists are not empty', () => {
      let view
      beforeEach(async () => {
        const workdirPath = await copyRepositoryDir(1)
        const repository = await buildRepository(workdirPath)
        fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'a change\n')
        fs.unlinkSync(path.join(workdirPath, 'b.txt'))
        const filePatches = await repository.getUnstagedChanges()
        view = new StagingView({repository, stagedChanges: [filePatches[0]], unstagedChanges: [filePatches[1]]})
      })

      it('focuses staged and unstaged lists accordingly', async () => {
        await view.selectList(ListTypes.STAGED)
        assert.equal(view.getSelectedList(), ListTypes.STAGED)
        let selectedLists = view.element.querySelectorAll('.git-StagingView-group.is-focused .git-StagingView-header')
        assert.equal(selectedLists.length, 1)
        assert.equal(selectedLists[0].textContent, 'Staged Changes')

        await view.selectList(ListTypes.UNSTAGED)
        assert.equal(view.getSelectedList(), ListTypes.UNSTAGED)
        selectedLists = view.element.querySelectorAll('.git-StagingView-group.is-focused .git-StagingView-header')
        assert.equal(selectedLists.length, 1)
        assert.equal(selectedLists[0].textContent, 'Unstaged Changes')

        await view.selectList(ListTypes.STAGED)
        assert.equal(view.getSelectedList(), ListTypes.STAGED)
        selectedLists = view.element.querySelectorAll('.git-StagingView-group.is-focused .git-StagingView-header')
        assert.equal(selectedLists.length, 1)
        assert.equal(selectedLists[0].textContent, 'Staged Changes')
      })

      describe('git:focus-unstaged-changes', () => {
        it('sets the unstaged list to be focused', () => {
          view.selectList(ListTypes.STAGED)
          assert.equal(view.getSelectedList(), ListTypes.STAGED)

          atom.commands.dispatch(view.element, 'git:focus-unstaged-changes')
          assert.equal(view.getSelectedList(), ListTypes.UNSTAGED)
        })
      })

      describe('git:focus-staged-changes', () => {
        it('sets the unstaged list to be focused', () => {
          view.selectList(ListTypes.UNSTAGED)
          assert.equal(view.getSelectedList(), ListTypes.UNSTAGED)

          atom.commands.dispatch(view.element, 'git:focus-staged-changes')
          assert.equal(view.getSelectedList(), ListTypes.STAGED)
        })
      })
    })

    describe('when list is empty', () => {
      it('doesn\'t select list', async () => {
        const workdirPath = await copyRepositoryDir(1)
        const repository = await buildRepository(workdirPath)
        fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'a change\n')
        const filePatches = await repository.getUnstagedChanges()
        const view = new StagingView({repository, stagedChanges: [], unstagedChanges: filePatches})
        const {stagedChangesView, unstagedChangesView} = view.refs

        await view.selectList(ListTypes.UNSTAGED)
        assert.equal(view.getSelectedList(), ListTypes.UNSTAGED)

        await view.selectList(ListTypes.STAGED)
        assert.notEqual(view.getSelectedList(), ListTypes.STAGED)
        assert.equal(view.getSelectedList(), ListTypes.UNSTAGED)
      })
    })
  })

  describe('selecting files', () => {
    describe('core:move-up and core:move-down', () => {
      let view, unstagedFilePatches, stagedFilePatches
      beforeEach(async () => {
        const workdirPath = await copyRepositoryDir(1)
        const repository = await buildRepository(workdirPath)
        fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'a change\n')
        fs.unlinkSync(path.join(workdirPath, 'b.txt'))
        fs.writeFileSync(path.join(workdirPath, 'c.txt'), 'another change\n')
        fs.writeFileSync(path.join(workdirPath, 'd.txt'), 'new file 1\n')
        fs.writeFileSync(path.join(workdirPath, 'e.txt'), 'new file 2\n')
        fs.writeFileSync(path.join(workdirPath, 'f.txt'), 'new file 3\n')
        const filePatches = await repository.getUnstagedChanges()
        await repository.applyPatchToIndex(filePatches[0])
        await repository.applyPatchToIndex(filePatches[1])
        await repository.applyPatchToIndex(filePatches[2])
        stagedFilePatches = await repository.getStagedChanges()
        unstagedFilePatches = await repository.getUnstagedChanges()
        view = new StagingView({repository, stagedChanges: stagedFilePatches, unstagedChanges: unstagedFilePatches})
      })

      it('selects next/previous Staged filePatch if there is one', () => {
        view.didSelectStagedFilePatch(stagedFilePatches[0])

        assert.equal(view.getSelectedList(), ListTypes.STAGED)
        assert.equal(getSelectedItemForStagedList(view), stagedFilePatches[0])

        atom.commands.dispatch(view.element, 'core:move-down')
        assert.deepEqual(getSelectedItemForStagedList(view), stagedFilePatches[1])

        atom.commands.dispatch(view.element, 'core:move-down')
        assert.deepEqual(getSelectedItemForStagedList(view), stagedFilePatches[2])

        atom.commands.dispatch(view.element, 'core:move-up')
        assert.deepEqual(getSelectedItemForStagedList(view), stagedFilePatches[1])

        atom.commands.dispatch(view.element, 'core:move-up')
        assert.deepEqual(getSelectedItemForStagedList(view), stagedFilePatches[0])
      })

      it('selects next/previous Unstaged filePatch if there is one', () => {
        view.didSelectUnstagedFilePatch(unstagedFilePatches[0])
        assert.equal(view.getSelectedList(), ListTypes.UNSTAGED)
        assert.equal(getSelectedItemForUnstagedList(view), unstagedFilePatches[0])

        atom.commands.dispatch(view.element, 'core:move-down')
        assert.deepEqual(getSelectedItemForUnstagedList(view), unstagedFilePatches[1])

        atom.commands.dispatch(view.element, 'core:move-down')
        assert.deepEqual(getSelectedItemForUnstagedList(view), unstagedFilePatches[2])

        atom.commands.dispatch(view.element, 'core:move-up')
        assert.deepEqual(getSelectedItemForUnstagedList(view), unstagedFilePatches[1])

        atom.commands.dispatch(view.element, 'core:move-up')
        assert.deepEqual(getSelectedItemForUnstagedList(view), unstagedFilePatches[0])
      })

      it('stops at Staged list boundaries and keeps current selection', () => {
        const lastStagedFilePatch = stagedFilePatches[stagedFilePatches.length - 1]
        view.didSelectStagedFilePatch(lastStagedFilePatch)
        assert.equal(view.getSelectedList(), ListTypes.STAGED)
        assert.deepEqual(getSelectedItemForStagedList(view), lastStagedFilePatch)

        atom.commands.dispatch(view.element, 'core:move-down')
        assert.equal(view.getSelectedList(), ListTypes.STAGED)
        assert.deepEqual(getSelectedItemForStagedList(view), lastStagedFilePatch)

        const firstStagedFilePatch = stagedFilePatches[0]
        view.didSelectStagedFilePatch(firstStagedFilePatch)
        assert.equal(view.getSelectedList(), ListTypes.STAGED)
        assert.deepEqual(getSelectedItemForStagedList(view), firstStagedFilePatch)

        atom.commands.dispatch(view.element, 'core:move-up')
        assert.equal(view.getSelectedList(), ListTypes.STAGED)
        assert.deepEqual(getSelectedItemForStagedList(view), firstStagedFilePatch)
      })

      it('stops at Unstaged list boundaries and keeps current selection', () => {
        const lastUnstagedFilePatch = unstagedFilePatches[unstagedFilePatches.length - 1]
        view.didSelectUnstagedFilePatch(lastUnstagedFilePatch)
        assert.equal(view.getSelectedList(), ListTypes.UNSTAGED)
        assert.deepEqual(getSelectedItemForUnstagedList(view), lastUnstagedFilePatch)

        atom.commands.dispatch(view.element, 'core:move-down')
        assert.equal(view.getSelectedList(), ListTypes.UNSTAGED)
        assert.deepEqual(getSelectedItemForUnstagedList(view), lastUnstagedFilePatch)

        const firstUnstagedFilePatch = unstagedFilePatches[0]
        view.didSelectStagedFilePatch(firstUnstagedFilePatch)
        assert.equal(view.getSelectedList(), ListTypes.UNSTAGED)
        assert.deepEqual(getSelectedItemForUnstagedList(view), firstUnstagedFilePatch)

        atom.commands.dispatch(view.element, 'core:move-up')
        assert.equal(view.getSelectedList(), ListTypes.UNSTAGED)
        assert.deepEqual(getSelectedItemForUnstagedList(view), firstUnstagedFilePatch)
      })
    })

    it('calls didSelectFilePatch when file is selected', async () => {
      const didSelectFilePatch = sinon.spy()

      const workdirPath = await copyRepositoryDir(1)
      const repository = await buildRepository(workdirPath)
      fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'a change\n')
      const [filePatch] = await repository.getUnstagedChanges()
      const view = new StagingView({repository, stagedChanges: [], unstagedChanges: [filePatch], didSelectFilePatch})
      const {stagedChangesView, unstagedChangesView} = view.refs

      unstagedChangesView.didSelectFilePatch(filePatch)
      assert.equal(didSelectFilePatch.callCount, 1)
      assert.deepEqual(didSelectFilePatch.args[0], [filePatch, 'unstaged'])

      stagedChangesView.didSelectFilePatch(filePatch)
      assert.equal(didSelectFilePatch.callCount, 2)
      assert.deepEqual(didSelectFilePatch.args[1], [filePatch, 'staged'])
    })
  })
})
