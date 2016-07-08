/** @babel */

import fs from 'fs'
import path from 'path'
import temp from 'temp'
import sinon from 'sinon'

import FileSystemChangeObserver from '../../lib/models/file-system-change-observer'

describe('FileSystemChangeObserver', async () => {
  it('emits an event when the currently active directory changes', async function () {
    this.timeout(5000) // increase the timeout because we're interacting with file system events.

    const changeSpy = sinon.spy()
    const changeObserver = new FileSystemChangeObserver()
    changeObserver.onDidChange(changeSpy)
    await changeObserver.start()

    const workdirPath1 = temp.mkdirSync()
    const workdirPath2 = temp.mkdirSync()
    await changeObserver.setActiveDirectoryPath(workdirPath1)
    fs.writeFileSync(path.join(workdirPath1, 'a.txt'), 'a change\n')
    fs.writeFileSync(path.join(workdirPath2, 'a.txt'), 'a change\n')
    await changeObserver.lastFileChangePromise
    assert(changeSpy.calledOnce)

    changeSpy.reset()
    await changeObserver.setActiveDirectoryPath(workdirPath2)
    fs.writeFileSync(path.join(workdirPath1, 'b.txt'), 'a change\n')
    fs.writeFileSync(path.join(workdirPath2, 'b.txt'), 'a change\n')
    await changeObserver.lastFileChangePromise
    assert(changeSpy.calledOnce)

    changeSpy.reset()
    await changeObserver.setActiveDirectoryPath(null)
    fs.writeFileSync(path.join(workdirPath1, 'c.txt'), 'a change\n')
    fs.writeFileSync(path.join(workdirPath2, 'c.txt'), 'a change\n')
    await Promise.race([changeObserver.lastFileChangePromise, timeout(500)])
    assert(!changeSpy.called)

    changeSpy.reset()
    await changeObserver.setActiveDirectoryPath(workdirPath1)
    await changeObserver.stop()
    fs.writeFileSync(path.join(workdirPath1, 'd.txt'), 'a change\n')
    await Promise.race([changeObserver.lastFileChangePromise, timeout(500)])
    assert(!changeSpy.called)
  })

  function timeout(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
})
