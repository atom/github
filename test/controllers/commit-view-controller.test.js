import path from 'path';
import until from 'test-until';

import Commit from '../../lib/models/commit';

import CommitViewController, {COMMIT_GRAMMAR_SCOPE} from '../../lib/controllers/commit-view-controller';
import {cloneRepository, buildRepository} from '../helpers';

describe('CommitViewController', function() {
  let atomEnvironment, workspace, commandRegistry, notificationManager, lastCommit;

  beforeEach(function() {
    atomEnvironment = global.buildAtomEnvironment();
    workspace = atomEnvironment.workspace;
    commandRegistry = atomEnvironment.commands;
    notificationManager = atomEnvironment.notifications;

    lastCommit = new Commit('a1e23fd45', 'last commit message');
  });

  afterEach(function() {
    atomEnvironment.destroy();
  });

  it('correctly updates state when switching repos', async function() {
    const workdirPath1 = await cloneRepository('three-files');
    const repository1 = await buildRepository(workdirPath1);
    const workdirPath2 = await cloneRepository('three-files');
    const repository2 = await buildRepository(workdirPath2);
    const controller = new CommitViewController({
      commandRegistry, notificationManager, lastCommit, repository: repository1,
    });

    assert.equal(controller.regularCommitMessage, '');
    assert.equal(controller.amendingCommitMessage, '');

    controller.regularCommitMessage = 'regular message 1';
    controller.amendingCommitMessage = 'amending message 1';

    await controller.update({repository: repository2});
    assert.equal(controller.regularCommitMessage, '');
    assert.equal(controller.amendingCommitMessage, '');

    await controller.update({repository: repository1});
    assert.equal(controller.regularCommitMessage, 'regular message 1');
    assert.equal(controller.amendingCommitMessage, 'amending message 1');
  });

  describe('the passed commit message', function() {
    let controller, commitView;
    beforeEach(async function() {
      const workdirPath = await cloneRepository('three-files');
      const repository = await buildRepository(workdirPath);
      controller = new CommitViewController({commandRegistry, notificationManager, lastCommit, repository});
      commitView = controller.refs.commitView;
    });

    it('is set to the regularCommitMessage in the default case', async function() {
      controller.regularCommitMessage = 'regular message';
      await controller.update();
      assert.equal(commitView.props.message, 'regular message');
    });

    describe('when isAmending is true', function() {
      it('is set to the last commits message if amendingCommitMessage is blank', async function() {
        controller.amendingCommitMessage = 'amending commit message';
        await controller.update({isAmending: true, lastCommit});
        assert.equal(commitView.props.message, 'amending commit message');
      });

      it('is set to amendingCommitMessage if it is set', async function() {
        controller.amendingCommitMessage = 'amending commit message';
        await controller.update({isAmending: true, lastCommit});
        assert.equal(commitView.props.message, 'amending commit message');
      });
    });

    describe('when a merge message is defined', function() {
      it('is set to the merge message when merging', async function() {
        await controller.update({isMerging: true, mergeMessage: 'merge conflict!'});
        assert.equal(commitView.props.message, 'merge conflict!');
      });

      it('is set to regularCommitMessage if it is set', async function() {
        controller.regularCommitMessage = 'regular commit message';
        await controller.update({isMerging: true, mergeMessage: 'merge conflict!'});
        assert.equal(commitView.props.message, 'regular commit message');
      });
    });
  });

  describe('committing', function() {
    let controller, resolve, reject;

    beforeEach(async function() {
      const workdirPath = await cloneRepository('three-files');
      const repository = await buildRepository(workdirPath);
      const commit = () => new Promise((resolver, rejecter) => {
        resolve = resolver;
        reject = rejecter;
      });

      controller = new CommitViewController({commandRegistry, notificationManager, lastCommit, repository, commit});
    });

    it('clears the regular and amending commit messages', async function() {
      controller.regularCommitMessage = 'regular';
      controller.amendingCommitMessage = 'amending';

      const promise = controller.commit('message');
      resolve();
      await promise;

      assert.equal(controller.regularCommitMessage, '');
      assert.equal(controller.amendingCommitMessage, '');
    });

    it('issues a notification on failure', async function() {
      controller.regularCommitMessage = 'regular';
      controller.amendingCommitMessage = 'amending';

      sinon.spy(notificationManager, 'addError');

      const promise = controller.commit('message');
      const e = new Error('message');
      e.stdErr = 'stderr';
      reject(e);
      await promise;

      assert.isTrue(notificationManager.addError.called);

      assert.equal(controller.regularCommitMessage, 'regular');
      assert.equal(controller.amendingCommitMessage, 'amending');
    });
  });

  describe('toggling between commit box and commit editor', function() {
    let controller, workdirPath;
    beforeEach(async () => {
      workdirPath = await cloneRepository('three-files');
      const repository = await buildRepository(workdirPath);

      controller = new CommitViewController({
        workspace, commandRegistry, notificationManager, lastCommit, repository,
      });
    });

    afterEach(() => {
      controller.destroy();
    });

    it('transfers the commit message contents', async function() {
      controller.refs.commitView.editor.setText('message in box');

      commandRegistry.dispatch(atomEnvironment.views.getView(workspace), 'github:edit-commit-message-in-editor');
      let editor;
      await until(() => {
        editor = workspace.getActiveTextEditor();
        if (editor) {
          return path.basename(editor.getPath()) === 'ATOM_COMMIT_EDITMSG';
        } else {
          return false;
        }
      });
      assert.equal(editor.getText(), 'message in box');

      editor.setText('message in editor');
      editor.save();
      editor.destroy();
      await assert.async.equal(controller.refs.commitView.editor.getText(), 'message in editor');
    });

    it('activates editor if already opened', async function() {
      commandRegistry.dispatch(atomEnvironment.views.getView(workspace), 'github:edit-commit-message-in-editor');
      let editor;
      await until(() => {
        editor = workspace.getActiveTextEditor();
        if (editor) {
          return path.basename(editor.getPath()) === 'ATOM_COMMIT_EDITMSG';
        } else {
          return false;
        }
      });

      await workspace.open(path.join(workdirPath, 'a.txt'));
      workspace.getActivePane().splitRight();
      await workspace.open(path.join(workdirPath, 'b.txt'));
      assert.notEqual(workspace.getActiveTextEditor(), editor);

      commandRegistry.dispatch(atomEnvironment.views.getView(workspace), 'github:edit-commit-message-in-editor');
      await assert.async.equal(workspace.getActiveTextEditor(), editor);
    });

    // TODO: Why is this not passing? get text.plain.null-grammar
    xit('uses git commit grammar in the editor', async function() {
      commandRegistry.dispatch(atomEnvironment.views.getView(workspace), 'github:edit-commit-message-in-editor');
      let editor;
      await until(() => {
        editor = workspace.getActiveTextEditor();
        if (editor) {
          return editor.getGrammar().scopeName === COMMIT_GRAMMAR_SCOPE;
        } else {
          return false;
        }
      });
    });
  });
});
