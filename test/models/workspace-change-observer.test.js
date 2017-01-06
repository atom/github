import path from 'path';

import {cloneRepository, buildRepository, until} from '../helpers';

import WorkspaceChangeObserver from '../../lib/models/workspace-change-observer';

describe('WorkspaceChangeObserver', function() {
  let atomEnv, workspace;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
    workspace = atomEnv.workspace;
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  it('emits a change event when the window is focused', async function() {
    const workdirPath = await cloneRepository('three-files');
    const repository = await buildRepository(workdirPath);

    const changeSpy = sinon.spy();
    const changeObserver = new WorkspaceChangeObserver(window, workspace, repository);
    changeObserver.onDidChange(changeSpy);

    window.dispatchEvent(new FocusEvent('focus'));
    assert.isFalse(changeSpy.called);

    await changeObserver.start();
    window.dispatchEvent(new FocusEvent('focus'));
    await until(() => changeSpy.calledOnce);
  });

  it('emits a change event when a staging action takes place', async function() {
    const workdirPath = await cloneRepository('three-files');
    const repository = await buildRepository(workdirPath);
    const changeSpy = sinon.spy();
    const changeObserver = new WorkspaceChangeObserver(window, workspace, repository);
    changeObserver.onDidChange(changeSpy);
    await changeObserver.start();

    const editor = await workspace.open(path.join(workdirPath, 'a.txt'));
    editor.setText('change');
    await repository.stageFiles(['a.txt']);
    assert.async.isTrue(changeSpy.called);
  });

  it('emits a change event when a buffer belonging to the project directory changes', async function() {
    const workdirPath = await cloneRepository('three-files');
    const repository = await buildRepository(workdirPath);
    const editor = await workspace.open(path.join(workdirPath, 'a.txt'));

    const changeSpy = sinon.spy();
    const changeObserver = new WorkspaceChangeObserver(window, workspace, repository);
    changeObserver.onDidChange(changeSpy);
    await changeObserver.start();

    editor.setText('change');
    editor.save();
    await until(() => changeSpy.calledOnce);

    changeSpy.reset();
    editor.getBuffer().reload();
    await until(() => changeSpy.calledOnce);

    changeSpy.reset();
    editor.destroy();
    await until(() => changeSpy.calledOnce);
  });
});
