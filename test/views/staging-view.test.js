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
  it('only renders the change lists when their data is loaded', async () => {
    const workdirPath = await copyRepositoryDir(1)
    const repository = await buildRepository(workdirPath)
    const view = new StagingView({repository})

    assert.isUndefined(view.refs.stagedChangesView)
    assert.isUndefined(view.refs.unstagedChangesView)

    await view.lastModelDataRefreshPromise

    assert(view.refs.stagedChangesView)
    assert(view.refs.unstagedChangesView)
  })

  describe('staging and unstaging files', () => {
    it('stages and unstages files', async () => {
      const workdirPath = await copyRepositoryDir(1)
      const repository = await buildRepository(workdirPath)
      fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'a change\n')
      fs.unlinkSync(path.join(workdirPath, 'b.txt'))
      const view = new StagingView({repository})
      await view.lastModelDataRefreshPromise

      const {stagedChangesView, unstagedChangesView} = view.refs
      const filePatches = unstagedChangesView.filePatches

      await unstagedChangesView.didConfirmFilePatch(filePatches[1])
      await view.lastModelDataRefreshPromise

      assert.deepEqual(unstagedChangesView.filePatches, [filePatches[0]])
      assert.deepEqual(stagedChangesView.filePatches, [filePatches[1]])

      await stagedChangesView.didConfirmFilePatch(filePatches[1])
      await view.lastModelDataRefreshPromise

      assert.deepEqual(unstagedChangesView.filePatches, filePatches)
      assert.deepEqual(stagedChangesView.filePatches, [])
    })

    describe('didConfirmSelectedFilePatch()', () => {
      it('stages and unstages files, updating lists accordingly', async () => {
        const workdirPath = await copyRepositoryDir(1)
        const repository = await buildRepository(workdirPath)
        fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'a change\n')
        fs.unlinkSync(path.join(workdirPath, 'b.txt'))
        const view = new StagingView({repository})
        await view.lastModelDataRefreshPromise

        const {stagedChangesView, unstagedChangesView} = view.refs
        const filePatches = unstagedChangesView.filePatches

        unstagedChangesView.didSelectFilePatch(filePatches[1])
        await view.didConfirmSelectedFilePatch()
        await view.lastModelDataRefreshPromise

        assert.deepEqual(unstagedChangesView.filePatches, [filePatches[0]])
        assert.deepEqual(stagedChangesView.filePatches, [filePatches[1]])

        // QUESITON: why do these not have reference equality
        // console.log(filePatches[1], stagedChangesView.filePatches[0], filePatches[1] === stagedChangesView.filePatches[0])
        stagedChangesView.didSelectFilePatch(stagedChangesView.filePatches[0])
        await view.didConfirmSelectedFilePatch()
        await view.lastModelDataRefreshPromise

        assert.deepEqual(unstagedChangesView.filePatches, filePatches)
        assert.deepEqual(stagedChangesView.filePatches, [])
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
        view = new StagingView({repository})
        await view.lastModelDataRefreshPromise

        const {stagedChangesView, unstagedChangesView} = view.refs
        const initialUnstagedFilePatches = unstagedChangesView.filePatches

        // Create three staged files, leaving three unstaged
        await unstagedChangesView.didConfirmFilePatch(initialUnstagedFilePatches[0])
        await view.lastModelDataRefreshPromise

        assert.equal(stagedChangesView.filePatches.length, 1)
        assert.equal(unstagedChangesView.filePatches.length, 1)
      })

      it('focuses staged and unstaged lists accordingly', async () => {
        await view.selectList(ListTypes.STAGED)
        assert.equal(view.getSelectedList(), ListTypes.STAGED)
        let selectedLists = view.element.querySelectorAll('.git-Panel-item.is-focused .is-header')
        assert.equal(selectedLists.length, 1)
        assert.equal(selectedLists[0].textContent, 'Staged Changes')

        await view.selectList(ListTypes.UNSTAGED)
        assert.equal(view.getSelectedList(), ListTypes.UNSTAGED)
        selectedLists = view.element.querySelectorAll('.git-Panel-item.is-focused .is-header')
        assert.equal(selectedLists.length, 1)
        assert.equal(selectedLists[0].textContent, 'Unstaged Changes')

        await view.selectList(ListTypes.STAGED)
        assert.equal(view.getSelectedList(), ListTypes.STAGED)
        selectedLists = view.element.querySelectorAll('.git-Panel-item.is-focused .is-header')
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
        const view = new StagingView({repository})
        await view.lastModelDataRefreshPromise

        const {stagedChangesView, unstagedChangesView} = view.refs
        assert.equal(unstagedChangesView.filePatches.length, 1)
        assert.equal(stagedChangesView.filePatches.length, 0)

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
        view = new StagingView({repository})
        await view.lastModelDataRefreshPromise

        const {stagedChangesView, unstagedChangesView} = view.refs
        const initialUnstagedFilePatches = unstagedChangesView.filePatches

        // Create three staged files, leaving three unstaged
        await unstagedChangesView.didConfirmFilePatch(initialUnstagedFilePatches[0])
        await view.lastModelDataRefreshPromise
        await unstagedChangesView.didConfirmFilePatch(initialUnstagedFilePatches[1])
        await view.lastModelDataRefreshPromise
        await unstagedChangesView.didConfirmFilePatch(initialUnstagedFilePatches[2])
        await view.lastModelDataRefreshPromise

        stagedFilePatches = stagedChangesView.filePatches
        unstagedFilePatches = unstagedChangesView.filePatches

        assert.equal(stagedFilePatches.length, 3)
        assert.equal(unstagedFilePatches.length, 3)
      })

      describe('keyboard navigation within Staged Changes list', () => {
        it('selects next/previous staged filePatch if there is one', () => {
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
      })

      describe('keyboard navigation within Unstaged Changes list', () => {
        it('selects next/previous unstaged filePatch if there is one', () => {
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
      })

      describe('keyboard navigation across Staged and Unstaged Changes lists', () => {
        it('jumps between the end of Staged Changes list and beginning of Unstaged Changes list', () => {
          const lastStagedFilePatch = stagedFilePatches[stagedFilePatches.length - 1]
          const firstUnstagedFilePatch = unstagedFilePatches[0]

          view.didSelectStagedFilePatch(lastStagedFilePatch)
          assert.equal(view.getSelectedList(), ListTypes.STAGED)
          assert.equal(getSelectedItemForStagedList(view), lastStagedFilePatch)

          atom.commands.dispatch(view.element, 'core:move-down')
          assert.equal(view.getSelectedList(), ListTypes.UNSTAGED)
          assert.deepEqual(getSelectedItemForUnstagedList(view), firstUnstagedFilePatch)

          atom.commands.dispatch(view.element, 'core:move-up')
          assert.equal(view.getSelectedList(), ListTypes.STAGED)
          assert.deepEqual(getSelectedItemForStagedList(view), lastStagedFilePatch)
        })

        it('jumps between the end of Unstaged Changes list and beginning of Staged Changes list', () => {
          const lastUnstagedFilePatch = unstagedFilePatches[unstagedFilePatches.length - 1]
          const firstStagedFilePatch = stagedFilePatches[0]

          view.didSelectUnstagedFilePatch(lastUnstagedFilePatch)
          assert.equal(view.getSelectedList(), ListTypes.UNSTAGED)
          assert.equal(getSelectedItemForUnstagedList(view), lastUnstagedFilePatch)

          atom.commands.dispatch(view.element, 'core:move-down')
          assert.equal(view.getSelectedList(), ListTypes.STAGED)
          assert.deepEqual(getSelectedItemForStagedList(view), firstStagedFilePatch)

          atom.commands.dispatch(view.element, 'core:move-up')
          assert.equal(view.getSelectedList(), ListTypes.UNSTAGED)
          assert.deepEqual(getSelectedItemForUnstagedList(view), lastUnstagedFilePatch)
        })
      })
    })

    it('calls didSelectFilePatch when file is selected', async () => {
      const didSelectFilePatch = sinon.spy()

      const workdirPath = await copyRepositoryDir(1)
      const repository = await buildRepository(workdirPath)
      fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'a change\n')
      const view = new StagingView({repository, didSelectFilePatch})
      await view.lastModelDataRefreshPromise

      const {stagedChangesView, unstagedChangesView} = view.refs
      const filePatch = unstagedChangesView.filePatches[0]

      assert(filePatch)

      unstagedChangesView.didSelectFilePatch(filePatch)
      assert.equal(didSelectFilePatch.callCount, 1)
      assert.deepEqual(didSelectFilePatch.args[0], [filePatch, 'unstaged'])

      stagedChangesView.didSelectFilePatch(filePatch)
      assert.equal(didSelectFilePatch.callCount, 2)
      assert.deepEqual(didSelectFilePatch.args[1], [filePatch, 'staged'])
    })
  })
})
