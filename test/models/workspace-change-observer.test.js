/** @babel */

import fs from 'fs'
import path from 'path'
import temp from 'temp'
import sinon from 'sinon'

import WorkspaceChangeObserver from '../../lib/models/workspace-change-observer'

describe('WorkspaceChangeObserver', () => {
  let atomEnv, workspace, project

  beforeEach(async () => {
    atomEnv = global.buildAtomEnvironment()
    workspace = atomEnv.workspace
    project = atomEnv.project
  })

  afterEach(() => {
    atomEnv.destroy()
  })

  it('emits a change event when the window is focused', async () => {
    const changeSpy = sinon.spy()
    const changeObserver = new WorkspaceChangeObserver(window, workspace, project)
    changeObserver.onDidChange(changeSpy)

    window.dispatchEvent(new FocusEvent('focus'))
    assert(!changeSpy.called)

    await changeObserver.start()
    window.dispatchEvent(new FocusEvent('focus'))
    assert(!changeSpy.called)

    await changeObserver.setActiveDirectoryPath(temp.mkdirSync())
    window.dispatchEvent(new FocusEvent('focus'))
    assert(changeSpy.calledOnce)
  })

  it('emits a change event when a buffer belonging to the active directory changes', async () => {
    const changeSpy = sinon.spy()
    const changeObserver = new WorkspaceChangeObserver(window, workspace, project)
    changeObserver.onDidChange(changeSpy)
    await changeObserver.start()
    const workdirPath1 = temp.mkdirSync()
    const workdirPath2 = temp.mkdirSync()
    fs.writeFileSync(path.join(workdirPath1, 'a.txt'), 'abcd')
    fs.writeFileSync(path.join(workdirPath2, 'a.txt'), 'abcd')
    await project.setPaths([workdirPath1, workdirPath2])
    await workspace.open(path.join(workdirPath1, 'a.txt'))
    await workspace.open(path.join(workdirPath2, 'a.txt'))

    const buffer1 = project.bufferForPathSync(path.join(workdirPath1, 'a.txt'))
    const buffer2 = project.bufferForPathSync(path.join(workdirPath2, 'a.txt'))
    await changeObserver.setActiveDirectoryPath(workdirPath2)
    buffer1.setText('change')
    buffer1.save()
    assert(!changeSpy.called)
    buffer2.setText('change')
    buffer2.save()
    assert(changeSpy.calledOnce)

    changeSpy.reset()
    await changeObserver.setActiveDirectoryPath(workdirPath1)
    buffer2.setText('change 1')
    buffer2.save()
    assert(!changeSpy.called)
    buffer1.setText('change 1')
    buffer1.save()
    assert(changeSpy.calledOnce)

    changeSpy.reset()
    buffer1.reload()
    assert(changeSpy.calledOnce)

    changeSpy.reset()
    buffer1.destroy()
    assert(changeSpy.calledOnce)

    changeSpy.reset()
    await changeObserver.setActiveDirectoryPath(null)
    buffer2.setText('change 2')
    buffer2.save()
    assert(!changeSpy.called)

    changeSpy.reset()
    await changeObserver.setActiveDirectoryPath(workdirPath2)
    await changeObserver.stop()
    buffer2.setText('change 2')
    buffer2.save()
    assert(!changeSpy.called)
  })
})
