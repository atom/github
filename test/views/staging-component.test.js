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
    assert.equal(component.focusedList, 'unstaged')
    let selectedLists = component.element.querySelectorAll('.git-Panel-item.is-focused .is-header')
    assert.equal(selectedLists.length, 1)
    assert.equal(selectedLists[0].textContent, 'Unstaged Changes')

    await component.didSelectStagedFilePatch()
    assert.equal(component.focusedList, 'staged')
    selectedLists = component.element.querySelectorAll('.git-Panel-item.is-focused .is-header')
    assert.equal(selectedLists.length, 1)
    assert.equal(selectedLists[0].textContent, 'Staged Changes')

    await component.didSelectUnstagedFilePatch()
    assert.equal(component.focusedList, 'unstaged')
    selectedLists = component.element.querySelectorAll('.git-Panel-item.is-focused .is-header')
    assert.equal(selectedLists.length, 1)
    assert.equal(selectedLists[0].textContent, 'Unstaged Changes')
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

  describe('keyboard navigation for Unstaged Changes list', () => {
    describe('core:move-up and core:move-down', () => {
      let component, unstagedFilePatches
      beforeEach(async () => {
        const workdirPath = await copyRepositoryDir(1)
        const repository = await buildRepository(workdirPath)
        fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'a change\n')
        fs.unlinkSync(path.join(workdirPath, 'b.txt'))
        fs.writeFileSync(path.join(workdirPath, 'c.txt'), 'another change\n')
        component = new StagingComponent({repository})
        await component.lastModelDataRefreshPromise

        const unstagedChangesComponent = component.refs.unstagedChangesComponent
        unstagedFilePatches = unstagedChangesComponent.filePatches
        component.didSelectUnstagedFilePatch(unstagedFilePatches[0])

        assert.equal(unstagedFilePatches.length, 3)
        assert.equal(component.focusedList, 'unstaged')
        assert.deepEqual(component.unstagedSelectedFilePatch, unstagedFilePatches[0])
      })

      it('selects next/previous filePatch if there is one', () => {
        atom.commands.dispatch(component.element, 'core:move-down')
        assert.deepEqual(component.unstagedSelectedFilePatch, unstagedFilePatches[1])

        atom.commands.dispatch(component.element, 'core:move-down')
        assert.deepEqual(component.unstagedSelectedFilePatch, unstagedFilePatches[2])

        atom.commands.dispatch(component.element, 'core:move-up')
        assert.deepEqual(component.unstagedSelectedFilePatch, unstagedFilePatches[1])

        atom.commands.dispatch(component.element, 'core:move-up')
        assert.deepEqual(component.unstagedSelectedFilePatch, unstagedFilePatches[0])
      })

      it('jumps to beginning/end of list if no next/previous filePatch', () => {
        atom.commands.dispatch(component.element, 'core:move-up')
        assert.deepEqual(component.unstagedSelectedFilePatch, unstagedFilePatches[2])

        atom.commands.dispatch(component.element, 'core:move-down')
        assert.deepEqual(component.unstagedSelectedFilePatch, unstagedFilePatches[0])
      })
    })
  })

  describe('keyboard navigation for Staged Changes list', () => {
    describe('core:move-up and core:move-down', () => {
      let component, stagedFilePatches
      beforeEach(async () => {
        const workdirPath = await copyRepositoryDir(1)
        const repository = await buildRepository(workdirPath)
        fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'a change\n')
        fs.unlinkSync(path.join(workdirPath, 'b.txt'))
        fs.writeFileSync(path.join(workdirPath, 'c.txt'), 'another change\n')
        component = new StagingComponent({repository})
        await component.lastModelDataRefreshPromise

        const unstagedChangesComponent = component.refs.unstagedChangesComponent
        const unstagedFilePatches = unstagedChangesComponent.filePatches
        await unstagedChangesComponent.didConfirmFilePatch(unstagedFilePatches[0])
        await component.lastModelDataRefreshPromise
        await unstagedChangesComponent.didConfirmFilePatch(unstagedFilePatches[1])
        await component.lastModelDataRefreshPromise
        await unstagedChangesComponent.didConfirmFilePatch(unstagedFilePatches[2])
        await component.lastModelDataRefreshPromise

        const stagedChangesComponent = component.refs.stagedChangesComponent
        stagedFilePatches = stagedChangesComponent.filePatches
        component.didSelectStagedFilePatch(stagedFilePatches[0])
        assert.equal(stagedFilePatches.length, 3)
        assert.equal(component.focusedList, 'staged')
        assert.deepEqual(component.stagedSelectedFilePatch, stagedFilePatches[0])
      })

      it('selects next/previous filePatch if there is one', () => {
        atom.commands.dispatch(component.element, 'core:move-down')
        assert.deepEqual(component.stagedSelectedFilePatch, stagedFilePatches[1])

        atom.commands.dispatch(component.element, 'core:move-down')
        assert.deepEqual(component.stagedSelectedFilePatch, stagedFilePatches[2])

        atom.commands.dispatch(component.element, 'core:move-up')
        assert.deepEqual(component.stagedSelectedFilePatch, stagedFilePatches[1])

        atom.commands.dispatch(component.element, 'core:move-up')
        assert.deepEqual(component.stagedSelectedFilePatch, stagedFilePatches[0])
      })

      it('jumps to beginning/end of list if no next/previous filePatch', () => {
        atom.commands.dispatch(component.element, 'core:move-up')
        assert.deepEqual(component.stagedSelectedFilePatch, stagedFilePatches[2])

        atom.commands.dispatch(component.element, 'core:move-down')
        assert.deepEqual(component.stagedSelectedFilePatch, stagedFilePatches[0])
      })
    })
  })
})
