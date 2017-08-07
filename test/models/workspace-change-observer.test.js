import path from 'path';

import until from 'test-until';

import {cloneRepository, buildRepository} from '../helpers';
import {writeFile} from '../../lib/helpers';

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

    await writeFile(path.join(workdirPath, 'a.txt'), 'change');
    await repository.stageFiles(['a.txt']);

    await assert.async.isTrue(changeSpy.called);
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
    await editor.save();
    await until(() => changeSpy.calledOnce);

    changeSpy.reset();
    editor.getBuffer().reload();
    await until(() => changeSpy.calledOnce);

    changeSpy.reset();
    editor.destroy();
    await until(() => changeSpy.calledOnce);
  });

  describe('when a buffer is renamed', function() {
    it('emits a change event with the new path', async function() {
      const workdirPath = await cloneRepository('three-files');
      const repository = await buildRepository(workdirPath);
      const editor = await workspace.open(path.join(workdirPath, 'a.txt'));

      const changeSpy = sinon.spy();
      const changeObserver = new WorkspaceChangeObserver(window, workspace, repository);
      changeObserver.onDidChange(changeSpy);
      await changeObserver.start();

      editor.getBuffer().setPath(path.join(workdirPath, 'renamed-path.txt'));

      editor.setText('change');
      await editor.save();
      await assert.async.isTrue(changeSpy.calledWith([{
        action: 'renamed',
        path: path.join(workdirPath, 'renamed-path.txt'),
        oldPath: path.join(workdirPath, 'a.txt'),
      }]));
    });
  });

  it('doesn\'t emit events for unsaved files', async function() {
    const workdirPath = await cloneRepository('three-files');
    const repository = await buildRepository(workdirPath);
    const editor = await workspace.open();

    const changeObserver = new WorkspaceChangeObserver(window, workspace, repository);
    await changeObserver.start();

    assert.doesNotThrow(() => editor.destroy());
  });
});
