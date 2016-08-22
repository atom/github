/** @babel */

import {cloneRepository, buildRepository} from '../helpers'
import path from 'path'
import fs from 'fs'
import sinon from 'sinon'

import StagingView, {ListTypes} from '../../lib/views/staging-view'

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

    describe('confirmSelectedItems()', () => {
      it('calls stageFilePatch or unstageFilePatch depending on the current staging state of the toggled file patch', async () => {
        const workdirPath = await cloneRepository('three-files')
        const repository = await buildRepository(workdirPath)
        fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'a change\n')
        fs.unlinkSync(path.join(workdirPath, 'b.txt'))
        const filePatches = await repository.getUnstagedChanges()
        const stageFiles = sinon.spy()
        const unstageFiles = sinon.spy()
        const view = new StagingView({repository, stagedChanges: [], unstagedChanges: filePatches, stageFiles, unstageFiles})

        view.selectList(ListTypes.UNSTAGED)
        view.selectItem(filePatches[1])
        view.confirmSelectedItems()
        assert.isTrue(stageFiles.calledWith(['b.txt']))

        await view.update({repository, stagedChanges: [filePatches[1]], unstagedChanges: [filePatches[0]], stageFiles, unstageFiles})
        await view.selectList(ListTypes.STAGED)
        view.selectItem(filePatches[1])
        view.confirmSelectedItems()
        assert.isTrue(unstageFiles.calledWith(['b.txt']))
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
    describe('selectNextFilePatch({addToExisting, stopAtBounds}) and selectPreviousFilePatch({addToExisting, stopAtBounds})', () => {
      it('selects next/previous staged filePatch if there is one, crossing the boundary between the unstaged and staged files unless stopAtBounds is true', async () => {
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
        assert.deepEqual(Array.from(view.getSelectedItems()), [unstagedFilePatches[0]])

        view.selectPreviousFilePatch()
        assert.equal(view.getSelectedListKey(), ListTypes.UNSTAGED)
        assert.deepEqual(Array.from(view.getSelectedItems()), [unstagedFilePatches[0]])

        view.selectNextFilePatch()
        assert.equal(view.getSelectedListKey(), ListTypes.UNSTAGED)
        assert.deepEqual(Array.from(view.getSelectedItems()), [unstagedFilePatches[1]])

        view.selectNextFilePatch()
        assert.equal(view.getSelectedListKey(), ListTypes.UNSTAGED)
        assert.deepEqual(Array.from(view.getSelectedItems()), [unstagedFilePatches[2]])

        view.selectNextFilePatch({stopAtBounds: true})
        assert.equal(view.getSelectedListKey(), ListTypes.UNSTAGED)
        assert.deepEqual(Array.from(view.getSelectedItems()), [unstagedFilePatches[2]])

        view.selectNextFilePatch()
        assert.equal(view.getSelectedListKey(), ListTypes.STAGED)
        assert.deepEqual(Array.from(view.getSelectedItems()), [stagedFilePatches[0]])

        view.selectNextFilePatch()
        assert.equal(view.getSelectedListKey(), ListTypes.STAGED)
        assert.deepEqual(Array.from(view.getSelectedItems()), [stagedFilePatches[1]])

        view.selectNextFilePatch()
        assert.equal(view.getSelectedListKey(), ListTypes.STAGED)
        assert.deepEqual(Array.from(view.getSelectedItems()), [stagedFilePatches[2]])

        view.selectNextFilePatch()
        assert.equal(view.getSelectedListKey(), ListTypes.STAGED)
        assert.deepEqual(Array.from(view.getSelectedItems()), [stagedFilePatches[2]])

        view.selectPreviousFilePatch()
        assert.equal(view.getSelectedListKey(), ListTypes.STAGED)
        assert.deepEqual(Array.from(view.getSelectedItems()), [stagedFilePatches[1]])

        view.selectPreviousFilePatch()
        assert.equal(view.getSelectedListKey(), ListTypes.STAGED)
        assert.deepEqual(Array.from(view.getSelectedItems()), [stagedFilePatches[0]])

        view.selectPreviousFilePatch({stopAtBounds: true})
        assert.equal(view.getSelectedListKey(), ListTypes.STAGED)
        assert.deepEqual(Array.from(view.getSelectedItems()), [stagedFilePatches[0]])

        view.selectPreviousFilePatch()
        assert.equal(view.getSelectedListKey(), ListTypes.UNSTAGED)
        assert.deepEqual(Array.from(view.getSelectedItems()), [unstagedFilePatches[2]])
      })

      it('retains currently selected filePatches when addToExisting is true', async () => {
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
        assert.deepEqual(Array.from(view.getSelectedItems()).length, 1)

        view.selectPreviousFilePatch({addToExisting: true})
        assert.equal(view.getSelectedListKey(), ListTypes.UNSTAGED)
        assert.deepEqual(Array.from(view.getSelectedItems()).length, 1)

        view.selectNextFilePatch({addToExisting: true})
        assert.equal(view.getSelectedListKey(), ListTypes.UNSTAGED)
        assert.deepEqual(Array.from(view.getSelectedItems()).length, 2)

        view.selectNextFilePatch({addToExisting: true})
        assert.equal(view.getSelectedListKey(), ListTypes.UNSTAGED)
        assert.deepEqual(Array.from(view.getSelectedItems()).length, 3)

        view.selectNextFilePatch({addToExisting: true, stopAtBounds: true})
        assert.equal(view.getSelectedListKey(), ListTypes.UNSTAGED)
        assert.deepEqual(Array.from(view.getSelectedItems()).length, 3)

        view.selectNextFilePatch()
        assert.equal(view.getSelectedListKey(), ListTypes.STAGED)
        assert.deepEqual(Array.from(view.getSelectedItems()).length, 1)

        view.selectNextFilePatch({addToExisting: true})
        assert.equal(view.getSelectedListKey(), ListTypes.STAGED)
        assert.deepEqual(Array.from(view.getSelectedItems()).length, 2)

        view.selectNextFilePatch({addToExisting: true})
        assert.equal(view.getSelectedListKey(), ListTypes.STAGED)
        assert.deepEqual(Array.from(view.getSelectedItems()).length, 3)

        view.selectNextFilePatch({addToExisting: true})
        assert.equal(view.getSelectedListKey(), ListTypes.STAGED)
        assert.deepEqual(Array.from(view.getSelectedItems()).length, 3)

        view.selectNextFilePatch()
        assert.equal(view.getSelectedListKey(), ListTypes.STAGED)
        assert.deepEqual(Array.from(view.getSelectedItems()).length, 1)

        view.selectPreviousFilePatch({addToExisting: true})
        assert.equal(view.getSelectedListKey(), ListTypes.STAGED)
        assert.deepEqual(Array.from(view.getSelectedItems()).length, 2)

        view.selectPreviousFilePatch({addToExisting: true})
        assert.equal(view.getSelectedListKey(), ListTypes.STAGED)
        assert.deepEqual(Array.from(view.getSelectedItems()).length, 3)

        view.selectPreviousFilePatch({addToExisting: true, stopAtBounds: true})
        assert.equal(view.getSelectedListKey(), ListTypes.STAGED)
        assert.deepEqual(Array.from(view.getSelectedItems()).length, 3)
      })
    })

    it('calls didSelectFilePatch when a file patch is selected via the mouse or keyboard if StagingView has focus', async () => {
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

      // doesn't get called if StagingView is not focused
      assert.isFalse(view.isFocused())
      view.enableSelections()
      view.selectItem(unstagedChangesView.props.items[0])
      assert.equal(didSelectFilePatch.callCount, 0)

      sinon.stub(view, 'isFocused', () => {
        return true
      })
      assert.isTrue(view.isFocused())

      // selection via mouse in unstaged changes
      view.enableSelections()
      view.selectItem(unstagedChangesView.props.items[0])
      assert.equal(didSelectFilePatch.callCount, 1)
      assert.deepEqual(didSelectFilePatch.args[0], [unstagedChangesView.props.items[0], 'unstaged', {focus: undefined}])

      // focus staged changes list and first item gets selected
      view.selectList(ListTypes.STAGED)
      assert.equal(didSelectFilePatch.callCount, 2)
      assert.deepEqual(didSelectFilePatch.args[1], [stagedChangesView.props.items[0], 'staged', {focus: undefined}])
      view.disableSelections()

      // select another item in staged changes list via mouse
      view.enableSelections()
      view.selectItem(stagedChangesView.props.items[1])
      assert.equal(didSelectFilePatch.callCount, 3)
      assert.deepEqual(didSelectFilePatch.args[2], [stagedChangesView.props.items[1], 'staged', {focus: undefined}])
      view.disableSelections()

      // select next via keyboard
      await view.selectNextFilePatch()
      assert.equal(didSelectFilePatch.callCount, 3)
      assert.deepEqual(didSelectFilePatch.args[2], [stagedChangesView.props.items[1], 'staged', {focus: undefined}])

      // select previous via keyboard
      await view.selectPreviousFilePatch()
      assert.equal(didSelectFilePatch.callCount, 4)
      assert.deepEqual(didSelectFilePatch.args[3], [stagedChangesView.props.items[0], 'staged', {focus: undefined}])

      // select previous via keyboard, cross boundary
      await view.selectPreviousFilePatch()
      assert.equal(didSelectFilePatch.callCount, 5)
      assert.deepEqual(didSelectFilePatch.args[4], [unstagedChangesView.props.items[0], 'unstaged', {focus: undefined}])
    })
  })
})
