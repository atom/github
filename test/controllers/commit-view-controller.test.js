import path from 'path';
import fs from 'fs';

import etch from 'etch';
import until from 'test-until';

import Commit from '../../lib/models/commit';

import CommitViewController, {COMMIT_GRAMMAR_SCOPE} from '../../lib/controllers/commit-view-controller';
import {cloneRepository, buildRepository} from '../helpers';

describe('CommitViewController', function() {
  let atomEnvironment, workspace, commandRegistry, notificationManager, grammars, lastCommit;

  beforeEach(function() {
    atomEnvironment = global.buildAtomEnvironment();
    workspace = atomEnvironment.workspace;
    commandRegistry = atomEnvironment.commands;
    notificationManager = atomEnvironment.notifications;
    grammars = atomEnvironment.grammars;

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
      workspace, commandRegistry, notificationManager, lastCommit, repository: repository1,
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
      controller = new CommitViewController({workspace, commandRegistry, notificationManager, lastCommit, repository});
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
    let controller, resolve, reject, workdirPath, repository;

    beforeEach(async function() {
      workdirPath = await cloneRepository('three-files');
      repository = await buildRepository(workdirPath);
      const commit = () => new Promise((resolver, rejecter) => {
        resolve = resolver;
        reject = rejecter;
      });

      controller = new CommitViewController({
        workspace,
        commandRegistry,
        notificationManager,
        grammars,
        lastCommit,
        repository,
        commit,
      });
    });

    afterEach(() => {
      controller.destroy();
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

    describe('toggling between commit box and commit editor', function() {
      it('transfers the commit message contents of the last editor', async function() {
        controller.refs.commitView.editor.setText('message in box');

        commandRegistry.dispatch(atomEnvironment.views.getView(workspace), 'github:toggle-expanded-commit-message-editor');
        await assert.async.equal(workspace.getActiveTextEditor().getPath(), controller.getCommitMessagePath());
        await assert.async.isTrue(controller.refs.commitView.props.deactivateCommitBox);
        const editor = workspace.getActiveTextEditor();
        assert.equal(editor.getText(), 'message in box');

        editor.setText('message in editor');
        await editor.save();

        commandRegistry.dispatch(atomEnvironment.views.getView(editor), 'pane:split-right-and-copy-active-item');
        await assert.async.notEqual(workspace.getActiveTextEditor(), editor);

        sinon.spy(controller.refs.commitView, 'update');
        editor.destroy();
        await until(() => controller.refs.commitView.update.called);
        assert.equal(controller.refs.commitView.editor.getText(), 'message in box');
        assert.isTrue(controller.refs.commitView.props.deactivateCommitBox);

        workspace.getActiveTextEditor().destroy();
        await assert.async.isFalse(controller.refs.commitView.props.deactivateCommitBox);
        await assert.async.equal(controller.refs.commitView.editor.getText(), 'message in editor');
      });

      it('transfers the commit message contents when in amending state', async function() {
        const originalMessage = 'message in box before amending';
        controller.refs.commitView.editor.setText(originalMessage);

        await controller.update({isAmending: true, lastCommit});
        assert.equal(controller.refs.commitView.editor.getText(), lastCommit.getMessage());

        commandRegistry.dispatch(atomEnvironment.views.getView(workspace), 'github:toggle-expanded-commit-message-editor');
        await assert.async.equal(workspace.getActiveTextEditor().getPath(), controller.getCommitMessagePath());
        const editor = workspace.getActiveTextEditor();
        assert.equal(editor.getText(), lastCommit.getMessage());

        const amendedMessage = lastCommit.getMessage() + 'plus some changes';
        editor.setText(amendedMessage);
        await editor.save();

        editor.destroy();
        await assert.async.equal(controller.refs.commitView.editor.getText(), amendedMessage);

        await controller.update({isAmending: false});
        await assert.async.equal(controller.refs.commitView.editor.getText(), originalMessage);

        await controller.update({isAmending: true, lastCommit});
        assert.equal(controller.refs.commitView.editor.getText(), amendedMessage);
      });

      it('activates editor if already opened but in background', async function() {
        commandRegistry.dispatch(atomEnvironment.views.getView(workspace), 'github:toggle-expanded-commit-message-editor');
        await assert.async.equal(workspace.getActiveTextEditor().getPath(), controller.getCommitMessagePath());
        const editor = workspace.getActiveTextEditor();

        await workspace.open(path.join(workdirPath, 'a.txt'));
        workspace.getActivePane().splitRight();
        await workspace.open(path.join(workdirPath, 'b.txt'));
        assert.notEqual(workspace.getActiveTextEditor(), editor);

        commandRegistry.dispatch(atomEnvironment.views.getView(workspace), 'github:toggle-expanded-commit-message-editor');
        await assert.async.equal(workspace.getActiveTextEditor(), editor);
      });

      it('closes all open commit message editors if one is in the foreground of a pane, prompting for unsaved changes', async function() {
        commandRegistry.dispatch(atomEnvironment.views.getView(workspace), 'github:toggle-expanded-commit-message-editor');
        await assert.async.equal(workspace.getActiveTextEditor().getPath(), controller.getCommitMessagePath());

        const editor = workspace.getActiveTextEditor();
        commandRegistry.dispatch(atomEnvironment.views.getView(editor), 'pane:split-right-and-copy-active-item');
        assert.equal(controller.getCommitMessageEditors().length, 2);

        // Activate another editor but keep commit message editor in foreground of inactive pane
        await workspace.open(path.join(workdirPath, 'a.txt'));
        assert.notEqual(workspace.getActiveTextEditor(), editor);

        editor.setText('make some new changes');

        // atom internals calls `confirm` on the ApplicationDelegate instead of the atom environment
        sinon.stub(atomEnvironment.applicationDelegate, 'confirm').callsFake((options, callback) => {
          if (typeof callback === 'function') {
            callback(0); // Save
          }
          return 0; // TODO: Remove this return and typeof check once https://github.com/atom/atom/pull/16229 is on stable
        });
        commandRegistry.dispatch(atomEnvironment.views.getView(workspace), 'github:toggle-expanded-commit-message-editor');
        await assert.async.equal(controller.getCommitMessageEditors().length, 0);
        assert.isTrue(atomEnvironment.applicationDelegate.confirm.called);
        await assert.async.equal(controller.refs.commitView.editor.getText(), 'make some new changes');
      });
    });

    describe('committing from commit editor', function() {
      it('uses git commit grammar in the editor', async function() {
        await atomEnvironment.packages.activatePackage('language-git');
        commandRegistry.dispatch(atomEnvironment.views.getView(workspace), 'github:toggle-expanded-commit-message-editor');
        await assert.async.equal(workspace.getActiveTextEditor().getGrammar().scopeName, COMMIT_GRAMMAR_SCOPE);
      });

      it('takes the commit message from the editor and deletes the `ATOM_COMMIT_EDITMSG` file', async function() {
        fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'some changes');
        await repository.stageFiles(['a.txt']);

        await controller.update({
          commit: repository.commit.bind(repository),
          prepareToCommit: () => true,
          stagedChangesExist: true,
        });

        commandRegistry.dispatch(atomEnvironment.views.getView(workspace), 'github:toggle-expanded-commit-message-editor');

        await assert.async.isTrue(controller.refs.commitView.isCommitButtonEnabled());
        const editor = workspace.getActiveTextEditor();
        assert.equal(editor.getPath(), controller.getCommitMessagePath());

        editor.setText('message in editor');
        await editor.save();
        commandRegistry.dispatch(atomEnvironment.views.getView(workspace), 'github:commit');

        await assert.async.equal((await repository.getLastCommit()).getMessage(), 'message in editor');
        await assert.async.isFalse(fs.existsSync(controller.getCommitMessagePath()));
      });

      it('asks user to confirm if commit editor has unsaved changes', async function() {
        const confirm = sinon.stub();
        const commit = sinon.stub();
        await controller.update({confirm, commit, prepareToCommit: () => true, stagedChangesExist: true});
        commandRegistry.dispatch(atomEnvironment.views.getView(workspace), 'github:toggle-expanded-commit-message-editor');
        await assert.async.equal(workspace.getActiveTextEditor().getPath(), controller.getCommitMessagePath());
        const editor = workspace.getActiveTextEditor();

        editor.setText('unsaved changes');
        commandRegistry.dispatch(atomEnvironment.views.getView(editor), 'pane:split-right-and-copy-active-item');
        await assert.async.notEqual(workspace.getActiveTextEditor(), editor);
        assert.equal(workspace.getTextEditors().length, 2);

        confirm.returns(1); // Cancel
        commandRegistry.dispatch(atomEnvironment.views.getView(workspace), 'github:commit');
        await etch.getScheduler().getNextUpdatePromise();
        assert.equal(commit.callCount, 0);

        confirm.returns(0); // Commit
        commandRegistry.dispatch(atomEnvironment.views.getView(workspace), 'github:commit');
        await etch.getScheduler().getNextUpdatePromise();
        await assert.async.equal(commit.callCount, 1);
        assert.equal(workspace.getTextEditors().length, 0);
      });
    });
  });
});
