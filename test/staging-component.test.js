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

    await unstagedChangesComponent.didConfirmFilePatch(fileDiffs[1])
    await component.lastModelDataRefreshPromise

    assert.deepEqual(unstagedChangesComponent.fileDiffs, [fileDiffs[0]])
    assert.deepEqual(stagedChangesComponent.fileDiffs, [fileDiffs[1]])

    await stagedChangesComponent.didConfirmFilePatch(fileDiffs[1])
    await component.lastModelDataRefreshPromise

    assert.deepEqual(unstagedChangesComponent.fileDiffs, fileDiffs)
    assert.deepEqual(stagedChangesComponent.fileDiffs, [])
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
    const filePatch = unstagedChangesComponent.fileDiffs[0]

    assert(filePatch)

    unstagedChangesComponent.didSelectFilePatch(filePatch)
    assert.equal(didSelectFilePatch.callCount, 1)
    assert.deepEqual(didSelectFilePatch.args[0], [filePatch, 'unstaged'])

    stagedChangesComponent.didSelectFilePatch(filePatch)
    assert.equal(didSelectFilePatch.callCount, 2)
    assert.deepEqual(didSelectFilePatch.args[1], [filePatch, 'staged'])
  })
})
