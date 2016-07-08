/** @babel */

import fs from 'fs'
import path from 'path'

import {copyRepositoryDir, buildRepository} from '../helpers'
import GitPanelController from '../../lib/controllers/git-panel-controller'

describe('GitPanelController', () => {
  let atomEnvironment, workspace, commandRegistry

  beforeEach(() => {
    atomEnvironment = global.buildAtomEnvironment()
    workspace = atomEnvironment.workspace
    commandRegistry = atomEnvironment.commands
  })

  afterEach(() => {
    atomEnvironment.destroy()
  })

  it.only('keeps the state of the GitPanelView in sync with the assigned repository', async (done) => {
    const workdirPath1 = await copyRepositoryDir(1)
    const repository1 = await buildRepository(workdirPath1)
    const workdirPath2 = await copyRepositoryDir(1)
    const repository2 = await buildRepository(workdirPath2)
    fs.writeFileSync(path.join(workdirPath1, 'a.txt'), 'a change\n')
    fs.unlinkSync(path.join(workdirPath1, 'b.txt'))
    const controller = new GitPanelController({workspace, commandRegistry, repository: repository1})

    // Does not render a GitPanelView until initial data is fetched
    assert.isUndefined(controller.refs.gitPanel)
    assert.isUndefined(controller.repository)
    await controller.lastModelDataRefreshPromise
    assert.isDefined(controller.repository)
    assert.equal(controller.refs.gitPanel.unstagedChanges, await repository1.getUnstagedChanges())

    // Fetches data when a new repository is assigned
    // Does not update repository instance variable until that data is fetched
    const updatePromise = controller.update({repository: repository2})
    assert.equal(controller.repository, repository1)
    assert.equal(controller.refs.gitPanel.unstagedChanges, await repository1.getUnstagedChanges())
    await updatePromise
    assert.equal(controller.repository, repository2)
    assert.equal(controller.refs.gitPanel.unstagedChanges, await repository2.getUnstagedChanges())

    // Fetches data and updates child view when the repository is mutated
    fs.writeFileSync(path.join(workdirPath2, 'a.txt'), 'a change\n')
    fs.unlinkSync(path.join(workdirPath2, 'b.txt'))
    await repository2.refresh()
    await controller.lastModelDataRefreshPromise
    assert.equal(controller.refs.gitPanel.unstagedChanges, await repository2.getUnstagedChanges())
  })
})
