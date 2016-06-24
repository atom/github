/** @babel */

import {copyRepositoryDir, buildRepository} from './helpers'
import path from 'path'
import fs from 'fs'
import sinon from 'sinon'

import StagingComponent from '../lib/staging-component'

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
    const fileDiffs = unstagedChangesComponent.fileDiffs

    await unstagedChangesComponent.didConfirmFileDiff(fileDiffs[1])
    await component.lastModelDataRefreshPromise

    assert.deepEqual(unstagedChangesComponent.fileDiffs, [fileDiffs[0]])
    assert.deepEqual(stagedChangesComponent.fileDiffs, [fileDiffs[1]])

    await stagedChangesComponent.didConfirmFileDiff(fileDiffs[1])
    await component.lastModelDataRefreshPromise

    assert.deepEqual(unstagedChangesComponent.fileDiffs, fileDiffs)
    assert.deepEqual(stagedChangesComponent.fileDiffs, [])
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

    await component.didSelectStagedFileDiff()
    assert.equal(component.focusedList, 'staged')
    selectedLists = component.element.querySelectorAll('.git-Panel-item.is-focused .is-header')
    assert.equal(selectedLists.length, 1)
    assert.equal(selectedLists[0].textContent, 'Staged Changes')

    await component.didSelectUnstagedFileDiff()
    assert.equal(component.focusedList, 'unstaged')
    selectedLists = component.element.querySelectorAll('.git-Panel-item.is-focused .is-header')
    assert.equal(selectedLists.length, 1)
    assert.equal(selectedLists[0].textContent, 'Unstaged Changes')
  })

  it('calls didSelectFileDiff when file is selected', async () => {
    const didSelectFileDiff = sinon.spy()

    const workdirPath = await copyRepositoryDir(1)
    const repository = await buildRepository(workdirPath)
    fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'a change\n')
    const component = new StagingComponent({repository, didSelectFileDiff})
    await component.lastModelDataRefreshPromise

    const {stagedChangesComponent, unstagedChangesComponent} = component.refs
    const fileDiff = unstagedChangesComponent.fileDiffs[0]

    assert(fileDiff)

    unstagedChangesComponent.didSelectFileDiff(fileDiff)
    assert.equal(didSelectFileDiff.callCount, 1)
    assert.deepEqual(didSelectFileDiff.args[0], [fileDiff, 'unstaged'])

    stagedChangesComponent.didSelectFileDiff(fileDiff)
    assert.equal(didSelectFileDiff.callCount, 2)
    assert.deepEqual(didSelectFileDiff.args[1], [fileDiff, 'staged'])
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
      const fileDiffs = unstagedChangesComponent.fileDiffs

      unstagedChangesComponent.didSelectFileDiff(fileDiffs[1])
      atom.commands.dispatch(component.element, 'core:confirm')
      await component.lastRepositoryStagePromise
      await component.lastModelDataRefreshPromise

      assert.deepEqual(unstagedChangesComponent.fileDiffs, [fileDiffs[0]])
      assert.deepEqual(stagedChangesComponent.fileDiffs, [fileDiffs[1]])

      stagedChangesComponent.didSelectFileDiff(fileDiffs[1])
      atom.commands.dispatch(component.element, 'core:confirm')
      await component.lastRepositoryStagePromise
      await component.lastModelDataRefreshPromise

      assert.deepEqual(unstagedChangesComponent.fileDiffs, fileDiffs)
      assert.deepEqual(stagedChangesComponent.fileDiffs, [])
    })
  })

  describe('keyboard navigation for Unstaged Changes list', () => {
    describe('core:move-up and core:move-down', () => {
      let component, unstagedFileDiffs
      beforeEach(async () => {
        const workdirPath = await copyRepositoryDir(1)
        const repository = await buildRepository(workdirPath)
        fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'a change\n')
        fs.unlinkSync(path.join(workdirPath, 'b.txt'))
        fs.writeFileSync(path.join(workdirPath, 'c.txt'), 'another change\n')
        component = new StagingComponent({repository})
        await component.lastModelDataRefreshPromise

        const unstagedChangesComponent = component.refs.unstagedChangesComponent
        unstagedFileDiffs = unstagedChangesComponent.fileDiffs
        component.didSelectUnstagedFileDiff(unstagedFileDiffs[0])

        assert.equal(unstagedFileDiffs.length, 3)
        assert.equal(component.focusedList, 'unstaged')
        assert.deepEqual(component.unstagedSelectedFileDiff, unstagedFileDiffs[0])
      })

      it('selects next/previous fileDiff if there is one', () => {
        atom.commands.dispatch(component.element, 'core:move-down')
        assert.deepEqual(component.unstagedSelectedFileDiff, unstagedFileDiffs[1])

        atom.commands.dispatch(component.element, 'core:move-down')
        assert.deepEqual(component.unstagedSelectedFileDiff, unstagedFileDiffs[2])

        atom.commands.dispatch(component.element, 'core:move-up')
        assert.deepEqual(component.unstagedSelectedFileDiff, unstagedFileDiffs[1])

        atom.commands.dispatch(component.element, 'core:move-up')
        assert.deepEqual(component.unstagedSelectedFileDiff, unstagedFileDiffs[0])
      })

      it('jumps to beginning/end of list if no next/previous fileDiff', () => {
        atom.commands.dispatch(component.element, 'core:move-up')
        assert.deepEqual(component.unstagedSelectedFileDiff, unstagedFileDiffs[2])

        atom.commands.dispatch(component.element, 'core:move-down')
        assert.deepEqual(component.unstagedSelectedFileDiff, unstagedFileDiffs[0])
      })
    })
  })

  describe('keyboard navigation for Staged Changes list', () => {
    describe('core:move-up and core:move-down', () => {
      let component, stagedFileDiffs
      beforeEach(async () => {
        const workdirPath = await copyRepositoryDir(1)
        const repository = await buildRepository(workdirPath)
        fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'a change\n')
        fs.unlinkSync(path.join(workdirPath, 'b.txt'))
        fs.writeFileSync(path.join(workdirPath, 'c.txt'), 'another change\n')
        component = new StagingComponent({repository})
        await component.lastModelDataRefreshPromise

        const unstagedChangesComponent = component.refs.unstagedChangesComponent
        const unstagedFileDiffs = unstagedChangesComponent.fileDiffs
        await unstagedChangesComponent.didConfirmFileDiff(unstagedFileDiffs[0])
        await component.lastModelDataRefreshPromise
        await unstagedChangesComponent.didConfirmFileDiff(unstagedFileDiffs[1])
        await component.lastModelDataRefreshPromise
        await unstagedChangesComponent.didConfirmFileDiff(unstagedFileDiffs[2])
        await component.lastModelDataRefreshPromise

        const stagedChangesComponent = component.refs.stagedChangesComponent
        stagedFileDiffs = stagedChangesComponent.fileDiffs
        component.didSelectStagedFileDiff(stagedFileDiffs[0])
        assert.equal(stagedFileDiffs.length, 3)
        assert.equal(component.focusedList, 'staged')
        assert.deepEqual(component.stagedSelectedFileDiff, stagedFileDiffs[0])
      })

      it('selects next/previous fileDiff if there is one', () => {
        atom.commands.dispatch(component.element, 'core:move-down')
        assert.deepEqual(component.stagedSelectedFileDiff, stagedFileDiffs[1])

        atom.commands.dispatch(component.element, 'core:move-down')
        assert.deepEqual(component.stagedSelectedFileDiff, stagedFileDiffs[2])

        atom.commands.dispatch(component.element, 'core:move-up')
        assert.deepEqual(component.stagedSelectedFileDiff, stagedFileDiffs[1])

        atom.commands.dispatch(component.element, 'core:move-up')
        assert.deepEqual(component.stagedSelectedFileDiff, stagedFileDiffs[0])
      })

      it('jumps to beginning/end of list if no next/previous fileDiff', () => {
        atom.commands.dispatch(component.element, 'core:move-up')
        assert.deepEqual(component.stagedSelectedFileDiff, stagedFileDiffs[2])

        atom.commands.dispatch(component.element, 'core:move-down')
        assert.deepEqual(component.stagedSelectedFileDiff, stagedFileDiffs[0])
      })
    })
  })
})
