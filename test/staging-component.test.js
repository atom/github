/** @babel */

import {copyRepositoryDir, buildRepository} from './helpers'
import path from 'path'
import fs from 'fs'

import StagingComponent from '../lib/staging-component'

describe('StagingComponent', () => {
  it('only renders the change lists when their data is loaded', async () => {
    const workdirPath = await copyRepositoryDir(1)
    const repository = await buildRepository(workdirPath)
    const component = new StagingComponent({repository})

    assert.isNull(component.element.querySelector('.git-UnstagedChanges'))
    assert.isNull(component.element.querySelector('.git-StagedChanges'))

    await component.refreshModelData()

    assert.isNotNull(component.element.querySelector('.git-UnstagedChanges'))
    assert.isNotNull(component.element.querySelector('.git-StagedChanges'))
  })

  it('stages and unstages files, updating the change lists accordingly', async () => {
    const workdirPath = await copyRepositoryDir(1)
    const repository = await buildRepository(workdirPath)
    fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'a change\n')
    fs.unlinkSync(path.join(workdirPath, 'b.txt'))
    const component = new StagingComponent({repository})
    await component.refreshModelData()

    const {stagedChangesComponent, unstagedChangesComponent} = component.refs
    const fileDiffs = unstagedChangesComponent.fileDiffs

    await unstagedChangesComponent.onDidDoubleClickFileDiff(fileDiffs[1])

    assert.deepEqual(unstagedChangesComponent.fileDiffs, [fileDiffs[0]])
    assert.deepEqual(stagedChangesComponent.fileDiffs, [fileDiffs[1]])

    await stagedChangesComponent.onDidDoubleClickFileDiff(fileDiffs[1])

    assert.deepEqual(unstagedChangesComponent.fileDiffs, fileDiffs)
    assert.deepEqual(stagedChangesComponent.fileDiffs, [])
  })
})
