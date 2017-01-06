import fs from 'fs';
import path from 'path';

import {cloneRepository, buildRepository, setUpLocalAndRemoteRepositories} from '../helpers';

import FileSystemChangeObserver from '../../lib/models/file-system-change-observer';

describe('FileSystemChangeObserver', function() {
  beforeEach(function() {
    this.timeout(5000); // increase the timeout because we're interacting with file system events.
  });

  it('emits an event when a project file is modified, created, or deleted', async function() {
    const workdirPath = await cloneRepository('three-files');
    const repository = await buildRepository(workdirPath);
    const changeSpy = sinon.spy();
    const changeObserver = new FileSystemChangeObserver(repository);
    changeObserver.onDidChange(changeSpy);
    await changeObserver.start();

    fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'a change\n');
    await changeObserver.lastFileChangePromise;
    assert.isTrue(changeSpy.calledOnce);

    changeSpy.reset();
    fs.writeFileSync(path.join(workdirPath, 'new-file.txt'), 'a change\n');
    await changeObserver.lastFileChangePromise;
    assert.isTrue(changeSpy.calledOnce);

    changeSpy.reset();
    fs.unlinkSync(path.join(workdirPath, 'a.txt'));
    await changeObserver.lastFileChangePromise;
    assert.isTrue(changeSpy.calledOnce);
  });

  it('emits an event when a file is staged or unstaged', async function() {
    const workdirPath = await cloneRepository('three-files');
    const repository = await buildRepository(workdirPath);
    const changeSpy = sinon.spy();
    const changeObserver = new FileSystemChangeObserver(repository);
    changeObserver.onDidChange(changeSpy);
    await changeObserver.start();

    fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'a change\n');
    await repository.git.exec(['add', 'a.txt']);
    await changeObserver.lastFileChangePromise;
    assert.isTrue(changeSpy.called);

    changeSpy.reset();
    await repository.git.exec(['reset', 'a.txt']);
    await changeObserver.lastFileChangePromise;
    assert.isTrue(changeSpy.called);
  });

  it('emits an event when a branch is checked out', async function() {
    const workdirPath = await cloneRepository('three-files');
    const repository = await buildRepository(workdirPath);
    const changeSpy = sinon.spy();
    const changeObserver = new FileSystemChangeObserver(repository);
    changeObserver.onDidChange(changeSpy);
    await changeObserver.start();

    await repository.git.exec(['checkout', '-b', 'new-branch']);
    await changeObserver.lastFileChangePromise;
    assert.isTrue(changeSpy.called);
  });

  it('emits an event when commits are pushed', async function() {
    const {localRepoPath} = await setUpLocalAndRemoteRepositories();
    const repository = await buildRepository(localRepoPath);
    const changeSpy = sinon.spy();
    const changeObserver = new FileSystemChangeObserver(repository);
    changeObserver.onDidChange(changeSpy);
    await changeObserver.start();

    await repository.git.exec(['commit', '--allow-empty', '-m', 'new commit']);
    await changeObserver.lastFileChangePromise;

    changeSpy.reset();
    await repository.git.exec(['push', 'origin', 'master']);
    await changeObserver.lastFileChangePromise;
    assert.isTrue(changeSpy.called);
  });

  it('emits an event when a new tracking branch is added after pushing', async function() {
    const {localRepoPath} = await setUpLocalAndRemoteRepositories();
    const repository = await buildRepository(localRepoPath);
    const changeSpy = sinon.spy();
    const changeObserver = new FileSystemChangeObserver(repository);
    changeObserver.onDidChange(changeSpy);
    await changeObserver.start();

    await repository.git.exec(['checkout', '-b', 'new-branch']);
    await changeObserver.lastFileChangePromise;

    changeSpy.reset();
    await repository.git.exec(['push', '--set-upstream', 'origin', 'new-branch']);
    await changeObserver.lastFileChangePromise;
    assert.isTrue(changeSpy.called);
  });

  it('emits an event when commits have been fetched', async function() {
    const {localRepoPath} = await setUpLocalAndRemoteRepositories({remoteAhead: true});
    const repository = await buildRepository(localRepoPath);
    const changeSpy = sinon.spy();
    const changeObserver = new FileSystemChangeObserver(repository);
    changeObserver.onDidChange(changeSpy);
    await changeObserver.start();

    await repository.git.exec(['fetch', 'origin', 'master']);
    await changeObserver.lastFileChangePromise;
    assert.isTrue(changeSpy.called);
  });
});
