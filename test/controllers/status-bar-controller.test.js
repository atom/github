/** @babel */

import {copyRepositoryDir, buildRepository, cloneRepository, createEmptyCommit} from '../helpers'
import path from 'path'
import fs from 'fs'
import sinon from 'sinon'

import StatusBarController from '../../lib/controllers/status-bar-controller'

describe('StatusBarController', () => {
  it('shows the changed files count view when the repository data is loaded', async () => {
    const didClickChangedFiles = sinon.spy()
    const view = new StatusBarController({repository: null, didClickChangedFiles})
    assert.isUndefined(view.refs.changedFilesCount)

    const workdirPath = await copyRepositoryDir('three-files')
    const repository = await buildRepository(workdirPath)
    view.update({repository})
    await view.lastModelDataRefreshPromise
    assert.deepEqual(view.refs.changedFilesCount.props.stagedChanges, [])
    assert.deepEqual(view.refs.changedFilesCount.props.unstagedChanges, [])

    fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'a change\n')
    fs.unlinkSync(path.join(workdirPath, 'b.txt'))
    const [patchToStage] = await repository.refreshUnstagedChanges()
    await repository.applyPatchToIndex(patchToStage)
    await view.lastModelDataRefreshPromise
    assert.deepEqual(view.refs.changedFilesCount.props.stagedChanges, await repository.refreshStagedChanges())
    assert.deepEqual(view.refs.changedFilesCount.props.unstagedChanges, await repository.refreshUnstagedChanges())

    view.refs.changedFilesCount.props.didClick()
    assert(didClickChangedFiles.calledOnce)
  })
})
