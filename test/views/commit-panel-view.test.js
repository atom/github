/** @babel */

import {copyRepositoryDir, buildRepository} from '../helpers'
import path from 'path'
import fs from 'fs'

import CommitPanelView from '../../lib/views/commit-panel-view'

describe('CommitPanelView', () => {
  let atomEnv, workspace, commandRegistry

  beforeEach(() => {
    atomEnv = global.buildAtomEnvironment()
    workspace = atomEnv.workspace
    commandRegistry = atomEnv.commands
  })

  afterEach(() => {
    atomEnv.destroy()
  })

  it('renders the staging and the commit views when there is a repository and its data is loaded upon initialization or after it updates', async () => {
    const view = new CommitPanelView({workspace, commandRegistry, repository: null})
    assert.isUndefined(view.refs.stagingView)
    assert.isUndefined(view.refs.commitView)

    const workdirPath = await copyRepositoryDir(1)
    const repository = await buildRepository(workdirPath)
    view.update({repository})
    assert.isUndefined(view.refs.stagingView)
    assert.isUndefined(view.refs.commitView)

    await view.lastModelDataRefreshPromise
    assert.isDefined(view.refs.stagingView)
    assert.isDefined(view.refs.commitView)

    fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'a change\n')
    fs.unlinkSync(path.join(workdirPath, 'b.txt'))
    const [unstagedPatch1, unstagedPatch2] = await repository.refreshUnstagedChanges()
    await repository.applyPatchToIndex(unstagedPatch1)
    const [stagedPatch1] = await repository.refreshStagedChanges()
    await view.lastModelDataRefreshPromise
    assert.deepEqual(view.refs.stagingView.stagedChanges, [stagedPatch1])
    assert.deepEqual(view.refs.stagingView.unstagedChanges, [unstagedPatch2])
    assert.deepEqual(view.refs.commitView.stagedChanges, [stagedPatch1])
  })
})
