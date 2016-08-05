/** @babel */

import fs from 'fs'
import path from 'path'
import temp from 'temp'
import sinon from 'sinon'

import {cloneRepository, buildRepository} from '../helpers'

import FileSystemChangeObserver from '../../lib/models/file-system-change-observer'

describe('FileSystemChangeObserver', async () => {
  it('emits an event when the currently active directory changes', async function () {
    this.timeout(5000) // increase the timeout because we're interacting with file system events.

    const workdirPath1 = await cloneRepository('three-files')
    const repository1 = await buildRepository(workdirPath1)
    const workdirPath2 = await cloneRepository('three-files')
    const repository2 = await buildRepository(workdirPath2)
    const changeSpy = sinon.spy()
    const changeObserver = new FileSystemChangeObserver()
    changeObserver.onDidChange(changeSpy)
    await changeObserver.start()

    await changeObserver.setActiveRepository(repository1)
    fs.writeFileSync(path.join(workdirPath1, 'a.txt'), 'a change\n')
    fs.writeFileSync(path.join(workdirPath2, 'a.txt'), 'a change\n')
    await changeObserver.lastFileChangePromise
    assert(changeSpy.calledOnce)

    changeSpy.reset()
    await changeObserver.setActiveRepository(repository2)
    fs.writeFileSync(path.join(workdirPath1, 'b.txt'), 'a change\n')
    fs.writeFileSync(path.join(workdirPath2, 'b.txt'), 'a change\n')
    await changeObserver.lastFileChangePromise
    assert(changeSpy.calledOnce)

    changeSpy.reset()
    await changeObserver.setActiveRepository(null)
    fs.writeFileSync(path.join(workdirPath1, 'c.txt'), 'a change\n')
    fs.writeFileSync(path.join(workdirPath2, 'c.txt'), 'a change\n')
    await Promise.race([changeObserver.lastFileChangePromise, timeout(500)])
    assert(!changeSpy.called)

    changeSpy.reset()
    await changeObserver.setActiveRepository(repository1)
    await changeObserver.stop()
    fs.writeFileSync(path.join(workdirPath1, 'd.txt'), 'a change\n')
    await Promise.race([changeObserver.lastFileChangePromise, timeout(500)])
    assert(!changeSpy.called)
  })

  function timeout(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
})
