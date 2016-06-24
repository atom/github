/** @babel */

import {copyRepositoryDir, buildRepository} from '../helpers'
import path from 'path'
import fs from 'fs'
import sinon from 'sinon'

import StagingComponent from '../../lib/views/staging-component'

describe('StagingComponent', () => {
  it('only renders the change lists when their data is loaded', async () => {
    const workdirPath = await copyRepositoryDir(1)
    const repository = await buildRepository(workdirPath)
    const component = new StagingComponent({repository})

    assert.isUndefined(component.refs.stagedChangesComponent)
    assert.isUndefined(component.refs.unstagedChangesComponent)

    await component.lastModelDataRefreshPromise

    assert(component.refs.stagedChangesComponent)
    assert(component.refs.unstagedChangesComponent)
  })

  it('stages and unstages files, updating the change lists accordingly', async () => {
    const workdirPath = await copyRepositoryDir(1)
    const repository = await buildRepository(workdirPath)
    fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'a change\n')
    fs.unlinkSync(path.join(workdirPath, 'b.txt'))
    const component = new StagingComponent({repository})
    await component.lastModelDataRefreshPromise

    const {stagedChangesComponent, unstagedChangesComponent} = component.refs
    const filePatches = unstagedChangesComponent.filePatches

    await unstagedChangesComponent.didConfirmFilePatch(filePatches[1])
    await component.lastModelDataRefreshPromise

    assert.deepEqual(unstagedChangesComponent.filePatches, [filePatches[0]])
    assert.deepEqual(stagedChangesComponent.filePatches, [filePatches[1]])

    await stagedChangesComponent.didConfirmFilePatch(filePatches[1])
    await component.lastModelDataRefreshPromise

    assert.deepEqual(unstagedChangesComponent.filePatches, filePatches)
    assert.deepEqual(stagedChangesComponent.filePatches, [])
  })

  it('focuses staged and unstaged lists accordingly', async () => {
    const workdirPath = await copyRepositoryDir(1)
    const repository = await buildRepository(workdirPath)
    const component = new StagingComponent({repository})

    await component.lastModelDataRefreshPromise
    assert.equal(component.focusedList, 'staged')
    let selectedLists = component.element.querySelectorAll('.git-Panel-item.is-focused .is-header')
    assert.equal(selectedLists.length, 1)
    assert.equal(selectedLists[0].textContent, 'Staged Changes')

    await component.didSelectUnstagedFilePatch()
    assert.equal(component.focusedList, 'unstaged')
    selectedLists = component.element.querySelectorAll('.git-Panel-item.is-focused .is-header')
    assert.equal(selectedLists.length, 1)
    assert.equal(selectedLists[0].textContent, 'Unstaged Changes')

    await component.didSelectStagedFilePatch()
    assert.equal(component.focusedList, 'staged')
    selectedLists = component.element.querySelectorAll('.git-Panel-item.is-focused .is-header')
    assert.equal(selectedLists.length, 1)
    assert.equal(selectedLists[0].textContent, 'Staged Changes')
  })

  it('calls didSelectFilePatch when file is selected', async () => {
    const didSelectFilePatch = sinon.spy()

    const workdirPath = await copyRepositoryDir(1)
    const repository = await buildRepository(workdirPath)
    fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'a change\n')
    const component = new StagingComponent({repository, didSelectFilePatch})
    await component.lastModelDataRefreshPromise

    const {stagedChangesComponent, unstagedChangesComponent} = component.refs
    const filePatch = unstagedChangesComponent.filePatches[0]

    assert(filePatch)

    unstagedChangesComponent.didSelectFilePatch(filePatch)
    assert.equal(didSelectFilePatch.callCount, 1)
    assert.deepEqual(didSelectFilePatch.args[0], [filePatch, 'unstaged'])

    stagedChangesComponent.didSelectFilePatch(filePatch)
    assert.equal(didSelectFilePatch.callCount, 2)
    assert.deepEqual(didSelectFilePatch.args[1], [filePatch, 'staged'])
  })

  describe('git:focus-unstaged-changes', () => {
    it('sets the unstaged list to be focused', async () => {
      const workdirPath = await copyRepositoryDir(1)
      const repository = await buildRepository(workdirPath)
      fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'a change\n')
      fs.unlinkSync(path.join(workdirPath, 'b.txt'))
      const component = new StagingComponent({repository})
      await component.lastModelDataRefreshPromise
      component.didSelectStagedFilePatch()
      assert.equal(component.focusedList, 'staged')

      atom.commands.dispatch(component.element, 'git:focus-unstaged-changes')
      assert.equal(component.focusedList, 'unstaged')
    })
  })

  describe('git:focus-staged-changes', () => {
    it('sets the unstaged list to be focused', async () => {
      const workdirPath = await copyRepositoryDir(1)
      const repository = await buildRepository(workdirPath)
      fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'a change\n')
      fs.unlinkSync(path.join(workdirPath, 'b.txt'))
      const component = new StagingComponent({repository})
      await component.lastModelDataRefreshPromise
      component.didSelectUnstagedFilePatch()
      assert.equal(component.focusedList, 'unstaged')

      atom.commands.dispatch(component.element, 'git:focus-staged-changes')
      assert.equal(component.focusedList, 'staged')
    })
  })

  describe('core:confirm', () => {
    it('stages and unstages files, updating lists accordingly', async () => {
      const workdirPath = await copyRepositoryDir(1)
      const repository = await buildRepository(workdirPath)
      fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'a change\n')
      fs.unlinkSync(path.join(workdirPath, 'b.txt'))
      const component = new StagingComponent({repository})
      await component.lastModelDataRefreshPromise

      const {stagedChangesComponent, unstagedChangesComponent} = component.refs
      const filePatches = unstagedChangesComponent.filePatches

      unstagedChangesComponent.didSelectFilePatch(filePatches[1])
      atom.commands.dispatch(component.element, 'core:confirm')
      await component.lastRepositoryStagePromise
      await component.lastModelDataRefreshPromise

      assert.deepEqual(unstagedChangesComponent.filePatches, [filePatches[0]])
      assert.deepEqual(stagedChangesComponent.filePatches, [filePatches[1]])

      stagedChangesComponent.didSelectFilePatch(filePatches[1])
      atom.commands.dispatch(component.element, 'core:confirm')
      await component.lastRepositoryStagePromise
      await component.lastModelDataRefreshPromise

      assert.deepEqual(unstagedChangesComponent.filePatches, filePatches)
      assert.deepEqual(stagedChangesComponent.filePatches, [])
    })
  })

  describe('core:move-up and core:move-down', () => {
    let component, unstagedFilePatches, stagedFilePatches
    beforeEach(async () => {
      const workdirPath = await copyRepositoryDir(1)
      const repository = await buildRepository(workdirPath)
      fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'a change\n')
      fs.unlinkSync(path.join(workdirPath, 'b.txt'))
      fs.writeFileSync(path.join(workdirPath, 'c.txt'), 'another change\n')
      fs.writeFileSync(path.join(workdirPath, 'd.txt'), 'new file 1\n')
      fs.writeFileSync(path.join(workdirPath, 'e.txt'), 'new file 2\n')
      fs.writeFileSync(path.join(workdirPath, 'f.txt'), 'new file 3\n')
      component = new StagingComponent({repository})
      await component.lastModelDataRefreshPromise

      const {stagedChangesComponent, unstagedChangesComponent} = component.refs
      const initialUnstagedFilePatches = unstagedChangesComponent.filePatches

      // Create three staged files, leaving three unstaged
      await unstagedChangesComponent.didConfirmFilePatch(initialUnstagedFilePatches[0])
      await component.lastModelDataRefreshPromise
      await unstagedChangesComponent.didConfirmFilePatch(initialUnstagedFilePatches[1])
      await component.lastModelDataRefreshPromise
      await unstagedChangesComponent.didConfirmFilePatch(initialUnstagedFilePatches[2])
      await component.lastModelDataRefreshPromise

      stagedFilePatches = stagedChangesComponent.filePatches
      unstagedFilePatches = unstagedChangesComponent.filePatches

      assert.equal(stagedFilePatches.length, 3)
      assert.equal(unstagedFilePatches.length, 3)
    })

    describe('keyboard navigation within Staged Changes list', () => {
      it('selects next/previous staged filePatch if there is one', () => {
        component.didSelectStagedFilePatch(stagedFilePatches[0])
        assert.equal(component.focusedList, 'staged')
        assert.equal(component.stagedSelectedFilePatch, stagedFilePatches[0])

        atom.commands.dispatch(component.element, 'core:move-down')
        assert.deepEqual(component.stagedSelectedFilePatch, stagedFilePatches[1])

        atom.commands.dispatch(component.element, 'core:move-down')
        assert.deepEqual(component.stagedSelectedFilePatch, stagedFilePatches[2])

        atom.commands.dispatch(component.element, 'core:move-up')
        assert.deepEqual(component.stagedSelectedFilePatch, stagedFilePatches[1])

        atom.commands.dispatch(component.element, 'core:move-up')
        assert.deepEqual(component.stagedSelectedFilePatch, stagedFilePatches[0])
      })
    })
    describe('keyboard navigation within Unstaged Changes list', () => {
      it('selects next/previous unstaged filePatch if there is one', () => {
        component.didSelectUnstagedFilePatch(unstagedFilePatches[0])
        assert.equal(component.focusedList, 'unstaged')
        assert.equal(component.unstagedSelectedFilePatch, unstagedFilePatches[0])

        atom.commands.dispatch(component.element, 'core:move-down')
        assert.deepEqual(component.unstagedSelectedFilePatch, unstagedFilePatches[1])

        atom.commands.dispatch(component.element, 'core:move-down')
        assert.deepEqual(component.unstagedSelectedFilePatch, unstagedFilePatches[2])

        atom.commands.dispatch(component.element, 'core:move-up')
        assert.deepEqual(component.unstagedSelectedFilePatch, unstagedFilePatches[1])

        atom.commands.dispatch(component.element, 'core:move-up')
        assert.deepEqual(component.unstagedSelectedFilePatch, unstagedFilePatches[0])
      })
    })
    describe('keyboard navigation across Staged and Unstaged Changes lists', () => {
      it('jumps between the end of Staged Changes list and beginning of Unstaged Changes list', () => {
        const lastStagedFilePatch = stagedFilePatches[stagedFilePatches.length - 1]
        const firstUnstagedFilePatch = unstagedFilePatches[0]

        component.didSelectStagedFilePatch(lastStagedFilePatch)
        assert.equal(component.focusedList, 'staged')
        assert.equal(component.stagedSelectedFilePatch, lastStagedFilePatch)

        atom.commands.dispatch(component.element, 'core:move-down')
        assert.deepEqual(component.focusedList, 'unstaged')
        assert.deepEqual(component.unstagedSelectedFilePatch, firstUnstagedFilePatch)

        atom.commands.dispatch(component.element, 'core:move-up')
        assert.deepEqual(component.focusedList, 'staged')
        assert.deepEqual(component.stagedSelectedFilePatch, lastStagedFilePatch)
      })

      it('jumps between the end of Unstaged Changes list and beginning of Staged Changes list', () => {
        const lastUnstagedFilePatch = unstagedFilePatches[unstagedFilePatches.length - 1]
        const firstStagedFilePatch = stagedFilePatches[0]

        component.didSelectUnstagedFilePatch(lastUnstagedFilePatch)
        assert.equal(component.focusedList, 'unstaged')
        assert.equal(component.unstagedSelectedFilePatch, lastUnstagedFilePatch)

        atom.commands.dispatch(component.element, 'core:move-down')
        assert.deepEqual(component.focusedList, 'staged')
        assert.deepEqual(component.stagedSelectedFilePatch, firstStagedFilePatch)

        atom.commands.dispatch(component.element, 'core:move-up')
        assert.deepEqual(component.focusedList, 'unstaged')
        assert.deepEqual(component.unstagedSelectedFilePatch, lastUnstagedFilePatch)
      })
    })
  })
})
