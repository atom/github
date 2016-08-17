/** @babel */

import {cloneRepository, buildRepository} from '../helpers'
import path from 'path'
import fs from 'fs'
import sinon from 'sinon'

import StagingView, {ListTypes} from '../../lib/views/staging-view'

const getSelectedItemForListType = (view, listKey) => {
  return view.multiList.getSelectedItemForKey(listKey)
}

describe('StagingView', () => {
  describe('staging and unstaging files', () => {
    it('renders staged and unstaged files', async () => {
      const workdirPath = await cloneRepository('three-files')
      const repository = await buildRepository(workdirPath)
      fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'a change\n')
      fs.unlinkSync(path.join(workdirPath, 'b.txt'))
      const filePatches = await repository.getUnstagedChanges()
      const view = new StagingView({repository, stagedChanges: [], unstagedChanges: filePatches})
      const {stagedChangesView, unstagedChangesView} = view.refs
      assert.deepEqual(stagedChangesView.props.items, [])
      assert.deepEqual(unstagedChangesView.props.items, filePatches)

      await view.update({repository, stagedChanges: [filePatches[1]], unstagedChanges: [filePatches[0]]})
      assert.deepEqual(stagedChangesView.props.items, [filePatches[1]])
      assert.deepEqual(unstagedChangesView.props.items, [filePatches[0]])

      await view.update({repository, stagedChanges: [], unstagedChanges: filePatches})
      assert.deepEqual(stagedChangesView.props.items, [])
      assert.deepEqual(unstagedChangesView.props.items, filePatches)
    })

    describe('confirmSelectedItem()', () => {
      it('calls stageFilePatch or unstageFilePatch depending on the current staging state of the toggled file patch', async () => {
        const workdirPath = await cloneRepository('three-files')
        const repository = await buildRepository(workdirPath)
        fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'a change\n')
        fs.unlinkSync(path.join(workdirPath, 'b.txt'))
        const filePatches = await repository.getUnstagedChanges()
        const stageFile = sinon.spy()
        const unstageFile = sinon.spy()
        const view = new StagingView({repository, stagedChanges: [], unstagedChanges: filePatches, stageFile, unstageFile})
        const {stagedChangesView, unstagedChangesView} = view.refs

        unstagedChangesView.props.didSelectItem(filePatches[1])
        view.confirmSelectedItem()
        assert.isTrue(stageFile.calledWith('b.txt'))

        await view.update({repository, stagedChanges: [filePatches[1]], unstagedChanges: [filePatches[0]], stageFile, unstageFile})
        stagedChangesView.props.didSelectItem(filePatches[1])
        view.confirmSelectedItem()
        assert.isTrue(unstageFile.calledWith('b.txt'))
      })
    })
  })

  describe('merge conflicts list', () => {
    it('is visible only when conflicted paths are passed', async () => {
      const workdirPath = await cloneRepository('three-files')
      const repository = await buildRepository(workdirPath)
      const view = new StagingView({repository, stagedChanges: [], unstagedChanges: []})

      assert.isUndefined(view.refs.mergeConflictListView)

      const mergeConflict = {
        getPath: () => 'conflicted-path',
        getFileStatus: () => 'modified',
        getOursStatus: () => 'removed',
        getTheirsStatus: () => 'modified'
      }
      await view.update({repository, mergeConflicts: [mergeConflict], stagedChanges: [], unstagedChanges: []})
      assert.isDefined(view.refs.mergeConflictListView)
    })
  })

  describe('selectList()', () => {
    describe('when lists are not empty', () => {
      it('focuses lists accordingly', async () => {
        const workdirPath = await cloneRepository('three-files')
        const repository = await buildRepository(workdirPath)
        fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'a change\n')
        fs.unlinkSync(path.join(workdirPath, 'b.txt'))
        const filePatches = await repository.getUnstagedChanges()
        const view = new StagingView({repository, stagedChanges: [filePatches[0]], unstagedChanges: [filePatches[1]]})

        await view.selectList(ListTypes.STAGED)
        assert.equal(view.getSelectedListKey(), ListTypes.STAGED)
        let selectedLists = view.element.querySelectorAll('.git-StagingView-group.is-focused .git-StagingView-header')
        assert.equal(selectedLists.length, 1)
        assert.equal(selectedLists[0].textContent, 'Staged Changes')

        await view.selectList(ListTypes.UNSTAGED)
        assert.equal(view.getSelectedListKey(), ListTypes.UNSTAGED)
        selectedLists = view.element.querySelectorAll('.git-StagingView-group.is-focused .git-StagingView-header')
        assert.equal(selectedLists.length, 1)
        assert.equal(selectedLists[0].textContent, 'Unstaged Changes')

        await view.selectList(ListTypes.STAGED)
        assert.equal(view.getSelectedListKey(), ListTypes.STAGED)
        selectedLists = view.element.querySelectorAll('.git-StagingView-group.is-focused .git-StagingView-header')
        assert.equal(selectedLists.length, 1)
        assert.equal(selectedLists[0].textContent, 'Staged Changes')
      })
    })

    describe('when list is empty', () => {
      it('doesn\'t select list', async () => {
        const workdirPath = await cloneRepository('three-files')
        const repository = await buildRepository(workdirPath)
        fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'a change\n')
        const filePatches = await repository.getUnstagedChanges()
        const view = new StagingView({repository, stagedChanges: [], unstagedChanges: filePatches})
        const {stagedChangesView, unstagedChangesView} = view.refs

        await view.selectList(ListTypes.UNSTAGED)
        assert.equal(view.getSelectedListKey(), ListTypes.UNSTAGED)

        await view.selectList(ListTypes.STAGED)
        assert.notEqual(view.getSelectedListKey(), ListTypes.STAGED)
        assert.equal(view.getSelectedListKey(), ListTypes.UNSTAGED)
      })
    })
  })

  describe('focusNextList()', () => {
    it('focuses lists accordingly', async () => {
      const workdirPath = await cloneRepository('three-files')
      const repository = await buildRepository(workdirPath)
      fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'a change\n')
      fs.unlinkSync(path.join(workdirPath, 'b.txt'))
      const filePatches = await repository.getUnstagedChanges()
      const view = new StagingView({repository, stagedChanges: [filePatches[0]], unstagedChanges: [filePatches[1]]})

      await view.focusNextList()
      assert.equal(view.getSelectedListKey(), ListTypes.STAGED)
      let selectedLists = view.element.querySelectorAll('.git-StagingView-group.is-focused .git-StagingView-header')
      assert.equal(selectedLists.length, 1)
      assert.equal(selectedLists[0].textContent, 'Staged Changes')

      await view.focusNextList()
      assert.equal(view.getSelectedListKey(), ListTypes.UNSTAGED)
      selectedLists = view.element.querySelectorAll('.git-StagingView-group.is-focused .git-StagingView-header')
      assert.equal(selectedLists.length, 1)
      assert.equal(selectedLists[0].textContent, 'Unstaged Changes')

      await view.focusNextList()
      assert.equal(view.getSelectedListKey(), ListTypes.STAGED)
      selectedLists = view.element.querySelectorAll('.git-StagingView-group.is-focused .git-StagingView-header')
      assert.equal(selectedLists.length, 1)
      assert.equal(selectedLists[0].textContent, 'Staged Changes')

      // skips empty lists
      await view.update({repository, stagedChanges: [filePatches[0]], unstagedChanges: []})
      await view.focusNextList()
      assert.equal(view.getSelectedListKey(), ListTypes.STAGED)
      selectedLists = view.element.querySelectorAll('.git-StagingView-group.is-focused .git-StagingView-header')
      assert.equal(selectedLists.length, 1)
      assert.equal(selectedLists[0].textContent, 'Staged Changes')
    })
  })

  describe('selecting files', () => {
    describe('selectNextFilePatch() and selectPreviousFilePatch()', () => {
      it('selects next/previous staged filePatch if there is one, crossing the boundary between the unstaged and staged files if necessary', async () => {
        const workdirPath = await cloneRepository('three-files')
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
        const stagedFilePatches = await repository.getStagedChanges()
        const unstagedFilePatches = await repository.getUnstagedChanges()
        const view = new StagingView({repository, stagedChanges: stagedFilePatches, unstagedChanges: unstagedFilePatches})

        assert.equal(view.getSelectedListKey(), ListTypes.UNSTAGED)
        assert.equal(getSelectedItemForListType(view, ListTypes.UNSTAGED), unstagedFilePatches[0])

        view.selectPreviousFilePatch()
        assert.equal(view.getSelectedListKey(), ListTypes.UNSTAGED)
        assert.equal(getSelectedItemForListType(view, ListTypes.UNSTAGED), unstagedFilePatches[0])

        view.selectNextFilePatch()
        assert.equal(view.getSelectedListKey(), ListTypes.UNSTAGED)
        assert.deepEqual(getSelectedItemForListType(view, ListTypes.UNSTAGED), unstagedFilePatches[1])

        view.selectNextFilePatch()
        assert.equal(view.getSelectedListKey(), ListTypes.UNSTAGED)
        assert.deepEqual(getSelectedItemForListType(view, ListTypes.UNSTAGED), unstagedFilePatches[2])

        view.selectNextFilePatch()
        assert.equal(view.getSelectedListKey(), ListTypes.STAGED)
        assert.deepEqual(getSelectedItemForListType(view, ListTypes.STAGED), stagedFilePatches[0])

        view.selectNextFilePatch()
        assert.equal(view.getSelectedListKey(), ListTypes.STAGED)
        assert.deepEqual(getSelectedItemForListType(view, ListTypes.STAGED), stagedFilePatches[1])

        view.selectNextFilePatch()
        assert.equal(view.getSelectedListKey(), ListTypes.STAGED)
        assert.deepEqual(getSelectedItemForListType(view, ListTypes.STAGED), stagedFilePatches[2])

        view.selectNextFilePatch()
        assert.equal(view.getSelectedListKey(), ListTypes.STAGED)
        assert.deepEqual(getSelectedItemForListType(view, ListTypes.STAGED), stagedFilePatches[2])

        view.selectPreviousFilePatch()
        assert.equal(view.getSelectedListKey(), ListTypes.STAGED)
        assert.deepEqual(getSelectedItemForListType(view, ListTypes.STAGED), stagedFilePatches[1])

        view.selectPreviousFilePatch()
        assert.equal(view.getSelectedListKey(), ListTypes.STAGED)
        assert.deepEqual(getSelectedItemForListType(view, ListTypes.STAGED), stagedFilePatches[0])

        view.selectPreviousFilePatch()
        assert.equal(view.getSelectedListKey(), ListTypes.UNSTAGED)
        assert.deepEqual(getSelectedItemForListType(view, ListTypes.UNSTAGED), unstagedFilePatches[2])
      })
    })

    it('calls didSelectFilePatch when a file patch is selected via the mouse or keyboard', async () => {
      const didSelectFilePatch = sinon.spy()

      const workdirPath = await cloneRepository('three-files')
      const repository = await buildRepository(workdirPath)
      fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'a change\n')
      fs.unlinkSync(path.join(workdirPath, 'b.txt'))
      fs.writeFileSync(path.join(workdirPath, 'c.txt'), 'another change\n')
      const filePatches = await repository.getUnstagedChanges()
      await repository.applyPatchToIndex(filePatches[0])
      await repository.applyPatchToIndex(filePatches[1])
      const stagedChanges = await repository.getStagedChanges()
      const unstagedChanges = await repository.getUnstagedChanges()

      const view = new StagingView({repository, stagedChanges, unstagedChanges, didSelectFilePatch})
      const {stagedChangesView, unstagedChangesView} = view.refs

      // selection via mouse in unstaged changes
      unstagedChangesView.props.didSelectItem(unstagedChangesView.props.items[0])
      assert.equal(didSelectFilePatch.callCount, 1)
      assert.deepEqual(didSelectFilePatch.args[0], [unstagedChangesView.props.items[0], 'unstaged'])

      // selection via mouse in staged changes
      stagedChangesView.props.didSelectItem(stagedChangesView.props.items[0])
      assert.equal(didSelectFilePatch.callCount, 2)
      assert.deepEqual(didSelectFilePatch.args[1], [stagedChangesView.props.items[0], 'staged'])

      // select next via keyboard
      await view.selectNextFilePatch()
      assert.equal(didSelectFilePatch.callCount, 3)
      assert.deepEqual(didSelectFilePatch.args[2], [stagedChangesView.props.items[1], 'staged'])

      // select previous via keyboard
      await view.selectPreviousFilePatch()
      assert.equal(didSelectFilePatch.callCount, 4)
      assert.deepEqual(didSelectFilePatch.args[3], [stagedChangesView.props.items[0], 'staged'])

      // select previous via keyboard, cross boundary
      await view.selectPreviousFilePatch()
      assert.equal(didSelectFilePatch.callCount, 5)
      assert.deepEqual(didSelectFilePatch.args[4], [unstagedChangesView.props.items[0], 'unstaged'])
    })
  })
})
