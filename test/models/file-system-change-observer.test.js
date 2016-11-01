/** @babel */

import fs from 'fs'
import path from 'path'
import temp from 'temp'
import sinon from 'sinon'

import {cloneRepository, buildRepository, setUpLocalAndRemoteRepositories} from '../helpers'

import FileSystemChangeObserver from '../../lib/models/file-system-change-observer'

describe('FileSystemChangeObserver', async () => {
  beforeEach(function () {
    this.timeout(5000) // increase the timeout because we're interacting with file system events.
  })

  it('emits an event when the currently active directory changes', async () => {
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
    assert.isTrue(changeSpy.calledOnce)

    changeSpy.reset()
    await changeObserver.setActiveRepository(repository2)
    fs.writeFileSync(path.join(workdirPath1, 'b.txt'), 'a change\n')
    fs.writeFileSync(path.join(workdirPath2, 'b.txt'), 'a change\n')
    await changeObserver.lastFileChangePromise
    assert.isTrue(changeSpy.calledOnce)

    changeSpy.reset()
    await changeObserver.setActiveRepository(null)
    fs.writeFileSync(path.join(workdirPath1, 'c.txt'), 'a change\n')
    fs.writeFileSync(path.join(workdirPath2, 'c.txt'), 'a change\n')
    await Promise.race([changeObserver.lastFileChangePromise, timeout(500)])
    assert.isTrue(!changeSpy.called)

    changeSpy.reset()
    await changeObserver.setActiveRepository(repository1)
    await changeObserver.stop()
    fs.writeFileSync(path.join(workdirPath1, 'd.txt'), 'a change\n')
    await Promise.race([changeObserver.lastFileChangePromise, timeout(500)])
    assert.isTrue(!changeSpy.called)
  })

  it('emits an event when a project file is modified, created, or deleted', async () => {
    const workdirPath = await cloneRepository('three-files')
    const repository = await buildRepository(workdirPath)
    const changeSpy = sinon.spy()
    const changeObserver = new FileSystemChangeObserver()
    changeObserver.onDidChange(changeSpy)
    await changeObserver.start()

    await changeObserver.setActiveRepository(repository)
    fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'a change\n')
    await changeObserver.lastFileChangePromise
    assert.isTrue(changeSpy.calledOnce)

    changeSpy.reset()
    fs.writeFileSync(path.join(workdirPath, 'new-file.txt'), 'a change\n')
    await changeObserver.lastFileChangePromise
    assert.isTrue(changeSpy.calledOnce)

    changeSpy.reset()
    fs.unlinkSync(path.join(workdirPath, 'a.txt'))
    await changeObserver.lastFileChangePromise
    assert.isTrue(changeSpy.calledOnce)
  })

  it('emits an event when a file is staged or unstaged', async () => {
    const workdirPath = await cloneRepository('three-files')
    const repository = await buildRepository(workdirPath)
    const changeSpy = sinon.spy()
    const changeObserver = new FileSystemChangeObserver()
    changeObserver.onDidChange(changeSpy)
    await changeObserver.start()
    await changeObserver.setActiveRepository(repository)

    fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'a change\n')
    await repository.git.exec(['add', 'a.txt'])
    await changeObserver.lastFileChangePromise
    assert.isTrue(changeSpy.calledOnce)

    changeSpy.reset()
    await repository.git.exec(['reset', 'a.txt'])
    await changeObserver.lastFileChangePromise
    assert.isTrue(changeSpy.calledOnce)
  })

  it('emits an event when a branch is checked out', async () => {
    const workdirPath = await cloneRepository('three-files')
    const repository = await buildRepository(workdirPath)
    const changeSpy = sinon.spy()
    const changeObserver = new FileSystemChangeObserver()
    changeObserver.onDidChange(changeSpy)
    await changeObserver.start()
    await changeObserver.setActiveRepository(repository)

    await repository.git.exec(['checkout', '-b', 'new-branch'])
    await changeObserver.lastFileChangePromise
    assert.isTrue(changeSpy.calledOnce)
  })

  it('emits an event when commits are pushed', async () => {
    const {localRepoPath} = await setUpLocalAndRemoteRepositories()
    const repository = await buildRepository(localRepoPath)
    const changeSpy = sinon.spy()
    const changeObserver = new FileSystemChangeObserver()
    changeObserver.onDidChange(changeSpy)
    await changeObserver.start()
    await changeObserver.setActiveRepository(repository)

    await repository.git.exec(['commit', '--allow-empty', '-m', 'new commit'])
    await changeObserver.lastFileChangePromise

    changeSpy.reset()
    await repository.git.exec(['push', 'origin', 'master'])
    await changeObserver.lastFileChangePromise
    assert.isTrue(changeSpy.calledOnce)
  })

  it('emits an event when a new tracking branch is added after pushing', async () => {
    const {localRepoPath} = await setUpLocalAndRemoteRepositories()
    const repository = await buildRepository(localRepoPath)
    const changeSpy = sinon.spy()
    const changeObserver = new FileSystemChangeObserver()
    changeObserver.onDidChange(changeSpy)
    await changeObserver.start()
    await changeObserver.setActiveRepository(repository)

    await repository.git.exec(['checkout', '-b', 'new-branch'])
    await changeObserver.lastFileChangePromise

    changeSpy.reset()
    await repository.git.exec(['push', '--set-upstream', 'origin', 'new-branch'])
    await changeObserver.lastFileChangePromise
    assert.isTrue(changeSpy.calledOnce)
  })

  it('emits an event when commits have been fetched', async () => {
    const {localRepoPath} = await setUpLocalAndRemoteRepositories({remoteAhead: true})
    const repository = await buildRepository(localRepoPath)
    const changeSpy = sinon.spy()
    const changeObserver = new FileSystemChangeObserver()
    changeObserver.onDidChange(changeSpy)
    await changeObserver.start()
    await changeObserver.setActiveRepository(repository)

    await repository.git.exec(['fetch'])
    await changeObserver.lastFileChangePromise
    assert.isTrue(changeSpy.calledOnce)
  })

  function timeout(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
})
