import path from 'path';
import fs from 'fs-extra';
import React from 'react';
import {shallow} from 'enzyme';

import Commit from '../../lib/models/commit';
import {nullBranch} from '../../lib/models/branch';

import CommitController, {COMMIT_GRAMMAR_SCOPE} from '../../lib/controllers/commit-controller';
import {cloneRepository, buildRepository, buildRepositoryWithPipeline} from '../helpers';

describe('CommitController', function() {
  let atomEnvironment, workspace, commandRegistry, notificationManager, lastCommit, config, confirm, tooltips;
  let app;

  beforeEach(function() {
    atomEnvironment = global.buildAtomEnvironment();
    workspace = atomEnvironment.workspace;
    commandRegistry = atomEnvironment.commands;
    notificationManager = atomEnvironment.notifications;
    config = atomEnvironment.config;
    tooltips = atomEnvironment.tooltips;
    confirm = sinon.stub(atomEnvironment, 'confirm');

    lastCommit = new Commit({sha: 'a1e23fd45', message: 'last commit message'});
    const noop = () => {};

    app = (
      <CommitController
        workspace={workspace}
        grammars={atomEnvironment.grammars}
        commandRegistry={commandRegistry}
        tooltips={tooltips}
        config={config}
        notificationManager={notificationManager}
        repository={{}}
        isMerging={false}
        mergeConflictsExist={false}
        stagedChangesExist={false}
        mergeMessage={''}
        lastCommit={lastCommit}
        currentBranch={nullBranch}
        prepareToCommit={noop}
        commit={noop}
        abortMerge={noop}
      />
    );
  });

  afterEach(function() {
    atomEnvironment.destroy();
  });

  it('correctly updates state when switching repos', async function() {
    const workdirPath1 = await cloneRepository('three-files');
    const repository1 = await buildRepository(workdirPath1);
    const workdirPath2 = await cloneRepository('three-files');
    const repository2 = await buildRepository(workdirPath2);

    app = React.cloneElement(app, {repository: repository1});
    const wrapper = shallow(app);

    assert.strictEqual(wrapper.instance().getRegularCommitMessage(), '');

    wrapper.instance().setRegularCommitMessage('regular message 1');

    wrapper.setProps({repository: repository2});

    assert.strictEqual(wrapper.instance().getRegularCommitMessage(), '');

    wrapper.setProps({repository: repository1});
    assert.equal(wrapper.instance().getRegularCommitMessage(), 'regular message 1');
  });

  describe('the passed commit message', function() {
    let repository;

    beforeEach(async function() {
      const workdirPath = await cloneRepository('three-files');
      repository = await buildRepository(workdirPath);
      app = React.cloneElement(app, {repository});
    });

    it('is set to the getRegularCommitMessage() in the default case', function() {
      repository.setRegularCommitMessage('regular message');
      const wrapper = shallow(app);
      assert.strictEqual(wrapper.find('CommitView').prop('message'), 'regular message');
    });

    describe('when a merge message is defined', function() {
      it('is set to the merge message when merging', function() {
        app = React.cloneElement(app, {isMerging: true, mergeMessage: 'merge conflict!'});
        const wrapper = shallow(app);
        assert.strictEqual(wrapper.find('CommitView').prop('message'), 'merge conflict!');
      });

      it('is set to getRegularCommitMessage() if it is set', function() {
        repository.setRegularCommitMessage('regular commit message');
        app = React.cloneElement(app, {isMerging: true, mergeMessage: 'merge conflict!'});
        const wrapper = shallow(app);
        assert.strictEqual(wrapper.find('CommitView').prop('message'), 'regular commit message');
      });
    });
  });

  describe('committing', function() {
    let workdirPath, repository;

    beforeEach(async function() {
      workdirPath = await cloneRepository('three-files');
      repository = await buildRepositoryWithPipeline(workdirPath, {confirm, notificationManager, workspace});
      const commit = message => repository.commit(message);

      app = React.cloneElement(app, {repository, commit});
    });

    it('clears the commit messages', async function() {
      repository.setRegularCommitMessage('regular');

      await fs.writeFile(path.join(workdirPath, 'a.txt'), 'some changes', {encoding: 'utf8'});
      await repository.git.exec(['add', '.']);

      const wrapper = shallow(app);
      await wrapper.instance().commit('message');

      assert.strictEqual(repository.getRegularCommitMessage(), '');
    });

    it('issues a notification on failure', async function() {
      repository.setRegularCommitMessage('regular');

      sinon.spy(notificationManager, 'addError');

      const wrapper = shallow(app);

      // Committing with no staged changes should cause commit error
      try {
        await wrapper.instance().commit('message');
      } catch (e) {
        assert(e, 'is error');
      }

      assert.isTrue(notificationManager.addError.called);

      assert.strictEqual(repository.getRegularCommitMessage(), 'regular');
    });

    describe('message formatting', function() {
      let commitSpy;
      beforeEach(function() {
        commitSpy = sinon.stub().returns(Promise.resolve());
        app = React.cloneElement(app, {commit: commitSpy});
      });

      it('wraps the commit message body at 72 characters if github.automaticCommitMessageWrapping is true', async function() {
        config.set('github.automaticCommitMessageWrapping', false);

        const wrapper = shallow(app);

        await wrapper.instance().commit([
          'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor',
          '',
          'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
        ].join('\n'));

        assert.deepEqual(commitSpy.args[0][0].split('\n'), [
          'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor',
          '',
          'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
        ]);

        commitSpy.reset();
        config.set('github.automaticCommitMessageWrapping', true);

        await wrapper.instance().commit([
          'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor',
          '',
          'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
        ].join('\n'));

        assert.deepEqual(commitSpy.args[0][0].split('\n'), [
          'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor',
          '',
          'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ',
          'ut aliquip ex ea commodo consequat.',
        ]);
      });
    });

    describe('toggling between commit box and commit editor', function() {
      it('transfers the commit message contents of the last editor', async function() {
        const wrapper = shallow(app);

        wrapper.find('CommitView').prop('toggleExpandedCommitMessageEditor')('message in box');
        await assert.async.equal(workspace.getActiveTextEditor().getPath(), wrapper.instance().getCommitMessagePath());
        assert.isTrue(wrapper.find('CommitView').prop('deactivateCommitBox'));

        const editor = workspace.getActiveTextEditor();
        assert.strictEqual(editor.getText(), 'message in box');
        editor.setText('message in editor');
        await editor.save();

        workspace.paneForItem(editor).splitRight({copyActiveItem: true});
        await assert.async.notEqual(workspace.getActiveTextEditor(), editor);

        editor.destroy();
        assert.isTrue(wrapper.find('CommitView').prop('deactivateCommitBox'));

        workspace.getActiveTextEditor().destroy();
        assert.isTrue(wrapper.find('CommitView').prop('deactivateCommitBox'));
        await assert.async.strictEqual(wrapper.find('CommitView').prop('message'), 'message in editor');
      });

      it('activates editor if already opened but in background', async function() {
        const wrapper = shallow(app);

        wrapper.find('CommitView').prop('toggleExpandedCommitMessageEditor')('sup');
        await assert.async.strictEqual(workspace.getActiveTextEditor().getPath(), wrapper.instance().getCommitMessagePath());
        const editor = workspace.getActiveTextEditor();

        await workspace.open(path.join(workdirPath, 'a.txt'));
        workspace.getActivePane().splitRight();
        await workspace.open(path.join(workdirPath, 'b.txt'));
        assert.notStrictEqual(workspace.getActiveTextEditor(), editor);

        wrapper.find('CommitView').prop('toggleExpandedCommitMessageEditor')();
        await assert.async.strictEqual(workspace.getActiveTextEditor(), editor);
      });

      it('closes all open commit message editors if one is in the foreground of a pane, prompting for unsaved changes', async function() {
        const wrapper = shallow(app);

        wrapper.find('CommitView').prop('toggleExpandedCommitMessageEditor')('sup');
        await assert.async.strictEqual(workspace.getActiveTextEditor().getPath(), wrapper.instance().getCommitMessagePath());

        const editor = workspace.getActiveTextEditor();
        workspace.paneForItem(editor).splitRight({copyActiveItem: true});
        assert.lengthOf(wrapper.instance().getCommitMessageEditors(), 2);

        // Activate another editor but keep commit message editor in foreground of inactive pane
        await workspace.open(path.join(workdirPath, 'a.txt'));
        assert.notStrictEqual(workspace.getActiveTextEditor(), editor);

        editor.setText('make some new changes');

        // atom internals calls `confirm` on the ApplicationDelegate instead of the atom environment
        sinon.stub(atomEnvironment.applicationDelegate, 'confirm').callsFake((options, callback) => {
          if (typeof callback === 'function') {
            callback(0); // Save
          }
          return 0; // TODO: Remove this return and typeof check once https://github.com/atom/atom/pull/16229 is on stable
        });
        wrapper.find('CommitView').prop('toggleExpandedCommitMessageEditor')();
        await assert.async.lengthOf(wrapper.instance().getCommitMessageEditors(), 0);
        assert.isTrue(atomEnvironment.applicationDelegate.confirm.called);
        await assert.async.strictEqual(wrapper.find('CommitView').prop('message'), 'make some new changes');
      });
    });

    describe('committing from commit editor', function() {
      it('uses git commit grammar in the editor', async function() {
        const wrapper = shallow(app);
        await atomEnvironment.packages.activatePackage('language-git');
        wrapper.find('CommitView').prop('toggleExpandedCommitMessageEditor')('sup');
        await assert.async.strictEqual(workspace.getActiveTextEditor().getGrammar().scopeName, COMMIT_GRAMMAR_SCOPE);
      });

      it('takes the commit message from the editor and deletes the `ATOM_COMMIT_EDITMSG` file', async function() {
        fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'some changes');
        await repository.stageFiles(['a.txt']);

        app = React.cloneElement(app, {prepareToCommit: () => true, stagedChangesExist: true});
        const wrapper = shallow(app);

        wrapper.find('CommitView').prop('toggleExpandedCommitMessageEditor')();
        await assert.async.strictEqual(workspace.getActiveTextEditor().getPath(), wrapper.instance().getCommitMessagePath());

        const editor = workspace.getActiveTextEditor();
        editor.setText('message in editor');
        await editor.save();
        wrapper.find('CommitView').prop('commit')('message in box');

        await assert.async.strictEqual((await repository.getLastCommit()).getMessage(), 'message in editor');
        await assert.async.isFalse(fs.existsSync(wrapper.instance().getCommitMessagePath()));
      });

      it('asks user to confirm if commit editor has unsaved changes', async function() {
        app = React.cloneElement(app, {confirm, prepareToCommit: () => true, stagedChangesExist: true});
        const wrapper = shallow(app);

        sinon.stub(repository.git, 'commit');
        wrapper.find('CommitView').prop('toggleExpandedCommitMessageEditor')();
        await assert.async.strictEqual(workspace.getActiveTextEditor().getPath(), wrapper.instance().getCommitMessagePath());

        const editor = workspace.getActiveTextEditor();
        editor.setText('unsaved changes');
        workspace.paneForItem(editor).splitRight({copyActiveItem: true});
        await assert.async.notStrictEqual(workspace.getActiveTextEditor(), editor);
        assert.lengthOf(workspace.getTextEditors(), 2);

        confirm.returns(1); // Cancel
        wrapper.find('CommitView').prop('commit')('message in box');
        assert.strictEqual(repository.git.commit.callCount, 0);

        confirm.returns(0); // Commit
        wrapper.find('CommitView').prop('commit')('message in box');
        await assert.async.equal(repository.git.commit.callCount, 1);
        await assert.async.lengthOf(workspace.getTextEditors(), 0);
      });
    });
  });
});
