/** @babel */

import {copyRepositoryDir, buildRepository, cloneRepository, createEmptyCommit} from '../helpers'
import path from 'path'
import fs from 'fs'

import GitPanelView from '../../lib/views/git-panel-view'

describe('GitPanelView', () => {
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
    const view = new GitPanelView({workspace, commandRegistry, repository: null})
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

  it('renders the push-pull view if there is a remote and updates the ahead/behind count upon fetch', async () => {
    const workdirPath = await copyRepositoryDir(1)
    const repoWithoutRemote = await buildRepository(workdirPath)

    const view = new GitPanelView({workspace, commandRegistry, repository: repoWithoutRemote})
    assert.isUndefined(view.refs.pushPullView)

    const {localRepoPath, remoteRepoPath} = await cloneRepository()
    const localRepo = await buildRepository(localRepoPath)

    view.update({repository: localRepo})
    await view.lastModelDataRefreshPromise
    assert.isDefined(view.refs.pushPullView)

    assert.equal(view.aheadCount, 0)
    assert.equal(view.behindCount, 0)

    await createEmptyCommit(remoteRepoPath, 'new remote commit')
    await createEmptyCommit(localRepoPath, 'new local commit')
    await createEmptyCommit(localRepoPath, 'another local commit')

    await view.fetch()

    assert.equal(view.aheadCount, 2)
    assert.equal(view.behindCount, 1)
  })
})
