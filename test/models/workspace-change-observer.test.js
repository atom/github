/** @babel */

import fs from 'fs'
import path from 'path'
import temp from 'temp'
import sinon from 'sinon'

import {copyRepositoryDir, buildRepository} from '../helpers'

import WorkspaceChangeObserver from '../../lib/models/workspace-change-observer'

describe('WorkspaceChangeObserver', () => {
  let atomEnv, workspace

  beforeEach(async () => {
    atomEnv = global.buildAtomEnvironment()
    workspace = atomEnv.workspace
  })

  afterEach(() => {
    atomEnv.destroy()
  })

  it('emits a change event when the window is focused', async () => {
    const changeSpy = sinon.spy()
    const changeObserver = new WorkspaceChangeObserver(window, workspace)
    changeObserver.onDidChange(changeSpy)

    window.dispatchEvent(new FocusEvent('focus'))
    assert(!changeSpy.called)

    await changeObserver.start()
    window.dispatchEvent(new FocusEvent('focus'))
    assert(!changeSpy.called)

    const workdirPath = copyRepositoryDir('three-files')
    const repository = await buildRepository(workdirPath)
    await changeObserver.setActiveRepository(repository)
    window.dispatchEvent(new FocusEvent('focus'))
    assert(changeSpy.calledOnce)
  })

  it('emits a change event when a buffer belonging to the active directory changes', async () => {
    const changeSpy = sinon.spy()
    const changeObserver = new WorkspaceChangeObserver(window, workspace)
    changeObserver.onDidChange(changeSpy)
    await changeObserver.start()
    const workdirPath1 = copyRepositoryDir('three-files')
    const repository1 = await buildRepository(workdirPath1)
    const workdirPath2 = copyRepositoryDir('three-files')
    const repository2 = await buildRepository(workdirPath2)

    const editor1 = await workspace.open(path.join(workdirPath1, 'a.txt'))
    const editor2 = await workspace.open(path.join(workdirPath2, 'a.txt'))
    await changeObserver.setActiveRepository(repository2)
    editor1.setText('change')
    editor1.save()
    assert(!changeSpy.called)
    editor2.setText('change')
    editor2.save()
    assert(changeSpy.calledOnce)

    changeSpy.reset()
    await changeObserver.setActiveRepository(repository1)
    editor2.setText('change 1')
    editor2.save()
    assert(!changeSpy.called)
    editor1.setText('change 1')
    editor1.save()
    assert(changeSpy.calledOnce)

    changeSpy.reset()
    const [unstagedChange] = await repository1.refreshUnstagedChanges()
    await repository1.applyPatchToIndex(unstagedChange)
    await changeObserver.lastIndexChangePromise
    assert(changeSpy.calledOnce)

    changeSpy.reset()
    editor1.getBuffer().reload()
    assert(changeSpy.calledOnce)

    changeSpy.reset()
    editor1.destroy()
    assert(changeSpy.calledOnce)

    changeSpy.reset()
    await changeObserver.setActiveRepository(null)
    editor2.setText('change 2')
    editor2.save()
    assert(!changeSpy.called)

    changeSpy.reset()
    await changeObserver.setActiveRepository(repository2)
    await changeObserver.stop()
    editor2.setText('change 2')
    editor2.save()
    assert(!changeSpy.called)
  })
})
