/** @babel */

import {cloneRepository, buildRepository} from '../helpers'
import path from 'path'
import fs from 'fs'
import sinon from 'sinon'

import ChangedFilesCountController from '../../lib/controllers/changed-files-count-controller'

describe('ChangedFilesCountController', () => {
  it.only('shows the changed files count view when the repository data is loaded', async () => {
    const didClick = sinon.spy()
    const view = new ChangedFilesCountController({repository: null, didClick})
    assert.isUndefined(view.refs.changedFilesCountWatcher.refs.changedFilesCount)

    const workdirPath = await cloneRepository('three-files')
    const repository = await buildRepository(workdirPath)
    view.update({repository})
    await view.refs.changedFilesCountWatcher.lastModelDataRefreshPromise
    window.v = view
    debugger
    assert.deepEqual(view.refs.changedFilesCountWatcher.refs.changedFilesCount.props.stagedChanges, [])
    assert.deepEqual(view.refs.changedFilesCountWatcher.refs.changedFilesCount.props.unstagedChanges, [])

    fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'a change\n')
    fs.unlinkSync(path.join(workdirPath, 'b.txt'))
    const [patchToStage] = await repository.refreshUnstagedChanges()
    await repository.applyPatchToIndex(patchToStage)
    await view.lastModelDataRefreshPromise
    assert.deepEqual(view.refs.changedFilesCountWatcher.refs.changedFilesCount.props.stagedChanges, await repository.refreshStagedChanges())
    assert.deepEqual(view.refs.changedFilesCountWatcher.refs.changedFilesCount.props.unstagedChanges, await repository.refreshUnstagedChanges())

    view.refs.changedFilesCountWatcher.refs.changedFilesCount.props.didClick()
    assert(didClick.calledOnce)
  })
})
