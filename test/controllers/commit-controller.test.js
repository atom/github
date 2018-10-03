import path from 'path';
import fs from 'fs-extra';
import React from 'react';
import {shallow, mount} from 'enzyme';

import Commit from '../../lib/models/commit';
import {nullBranch} from '../../lib/models/branch';
import UserStore from '../../lib/models/user-store';

import CommitController, {COMMIT_GRAMMAR_SCOPE} from '../../lib/controllers/commit-controller';
import {cloneRepository, buildRepository, buildRepositoryWithPipeline} from '../helpers';
import * as reporterProxy from '../../lib/reporter-proxy';

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
    const store = new UserStore({config});

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
        userStore={store}
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
    const workdirPath3 = await cloneRepository('commit-template');
    const repository3 = await buildRepository(workdirPath3);
    const templateCommitMessage = await repository3.git.getCommitMessageFromTemplate();

    app = React.cloneElement(app, {repository: repository1});
    const wrapper = shallow(app, {disableLifecycleMethods: true});

    assert.strictEqual(wrapper.instance().getCommitMessage(), '');

    wrapper.instance().setCommitMessage('message 1');

    wrapper.setProps({repository: repository2});

    assert.strictEqual(wrapper.instance().getCommitMessage(), '');

    wrapper.setProps({repository: repository1});
    assert.equal(wrapper.instance().getCommitMessage(), 'message 1');
    wrapper.setProps({repository: repository3});
    assert.equal(wrapper.instance().getCommitMessage(), templateCommitMessage);
  });


  describe('when commit.template config is set', function() {
    it('populates the commit message with the template', async function() {
      const workdirPath = await cloneRepository('commit-template');
      const repository = await buildRepository(workdirPath);
      const templateCommitMessage = await repository.git.getCommitMessageFromTemplate();
      app = React.cloneElement(app, {repository});
      const wrapper = shallow(app, {disableLifecycleMethods: true});
      assert.strictEqual(wrapper.instance().getCommitMessage(), templateCommitMessage);
    });
  });


  describe('the passed commit message', function() {
    let repository;

    beforeEach(async function() {
      const workdirPath = await cloneRepository('three-files');
      repository = await buildRepository(workdirPath);
      app = React.cloneElement(app, {repository});
    });

    it('is set to the getCommitMessage() in the default case', function() {
      repository.setCommitMessage('some message');
      const wrapper = shallow(app, {disableLifecycleMethods: true});
      assert.strictEqual(wrapper.find('CommitView').prop('message'), 'some message');
    });

    it('does not cause the repository to update when commit message changes', function() {
      repository.setCommitMessage('some message');
      const wrapper = shallow(app, {disableLifecycleMethods: true}).instance();
      sinon.spy(wrapper.props.repository.state, 'didUpdate');
      assert.strictEqual(wrapper.getCommitMessage(), 'some message');
      wrapper.handleMessageChange('new message');
      assert.strictEqual(wrapper.getCommitMessage(), 'new message');
      assert.isFalse(wrapper.props.repository.state.didUpdate.called);
    });

    describe('when a merge message is defined', function() {
      it('is set to the merge message when merging', function() {
        app = React.cloneElement(app, {isMerging: true, mergeMessage: 'merge conflict!'});
        const wrapper = shallow(app, {disableLifecycleMethods: true});
        assert.strictEqual(wrapper.find('CommitView').prop('message'), 'merge conflict!');
      });

      it('is set to getCommitMessage() if it is set', function() {
        repository.setCommitMessage('some commit message');
        app = React.cloneElement(app, {isMerging: true, mergeMessage: 'merge conflict!'});
        const wrapper = shallow(app, {disableLifecycleMethods: true});
        assert.strictEqual(wrapper.find('CommitView').prop('message'), 'some commit message');
      });
    });
  });

  describe('committing', function() {
    let workdirPath, repository, commit;

    beforeEach(async function() {
      workdirPath = await cloneRepository('three-files');
      repository = await buildRepositoryWithPipeline(workdirPath, {confirm, notificationManager, workspace});
      commit = sinon.stub().callsFake((...args) => repository.commit(...args));

      app = React.cloneElement(app, {repository, commit});
    });

    it('clears the commit messages', async function() {
      repository.setCommitMessage('a message');

      await fs.writeFile(path.join(workdirPath, 'a.txt'), 'some changes', {encoding: 'utf8'});
      await repository.git.exec(['add', '.']);

      const wrapper = shallow(app, {disableLifecycleMethods: true});
      await wrapper.instance().commit('another message');

      assert.strictEqual(repository.getCommitMessage(), '');
    });

    it('reload the commit messages from commit template', async function() {
      const repoPath = await cloneRepository('commit-template');
      const repo = await buildRepositoryWithPipeline(repoPath, {confirm, notificationManager, workspace});
      const templateCommitMessage = await repo.git.getCommitMessageFromTemplate();
      const commitStub = sinon.stub().callsFake((...args) => repo.commit(...args));
      const app2 = React.cloneElement(app, {repository: repo, commit: commitStub});

      await fs.writeFile(path.join(repoPath, 'a.txt'), 'some changes', {encoding: 'utf8'});
      await repo.git.exec(['add', '.']);

      const wrapper = shallow(app2, {disableLifecycleMethods: true});
      await wrapper.instance().commit('some message');
      assert.strictEqual(repo.getCommitMessage(), templateCommitMessage);
    });

    it('sets the verbatim flag when committing from the mini editor', async function() {
      await fs.writeFile(path.join(workdirPath, 'a.txt'), 'some changes', {encoding: 'utf8'});
      await repository.git.exec(['add', '.']);

      const wrapper = shallow(app, {disableLifecycleMethods: true});
      await wrapper.instance().commit('message\n\n#123 do some things');

      assert.isTrue(commit.calledWith('message\n\n#123 do some things', {
        amend: false,
        coAuthors: [],
        verbatim: true,
      }));
    });

    it('issues a notification on failure', async function() {
      repository.setCommitMessage('some message');

      sinon.spy(notificationManager, 'addError');

      const wrapper = shallow(app, {disableLifecycleMethods: true});

      // Committing with no staged changes should cause commit error
      try {
        await wrapper.instance().commit('message');
      } catch (e) {
        assert(e, 'is error');
      }

      assert.isTrue(notificationManager.addError.called);

      assert.strictEqual(repository.getCommitMessage(), 'some message');
    });

    describe('message formatting', function() {
      let commitSpy, wrapper;

      beforeEach(function() {
        commitSpy = sinon.stub().returns(Promise.resolve());
        app = React.cloneElement(app, {commit: commitSpy});
        wrapper = shallow(app, {disableLifecycleMethods: true});
      });

      describe('with automatic wrapping disabled', function() {
        beforeEach(function() {
          config.set('github.automaticCommitMessageWrapping', false);
        });

        it('passes commit messages through unchanged', async function() {
          await wrapper.instance().commit([
            'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor',
            '',
            'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
          ].join('\n'));

          assert.strictEqual(commitSpy.args[0][0], [
            'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor',
            '',
            'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
          ].join('\n'));
        });
      });

      describe('with automatic wrapping enabled', function() {
        beforeEach(function() {
          config.set('github.automaticCommitMessageWrapping', true);
        });

        it('wraps lines within the commit body at 72 characters', async function() {
          await wrapper.instance().commit([
            'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor',
            '',
            'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
          ].join('\n'));

          assert.strictEqual(commitSpy.args[0][0], [
            'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor',
            '',
            'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ',
            'ut aliquip ex ea commodo consequat.',
          ].join('\n'));
        });

        it('preserves existing line wraps within the commit body', async function() {
          await wrapper.instance().commit('a\n\nb\n\nc');
          assert.strictEqual(commitSpy.args[0][0], 'a\n\nb\n\nc');
        });
      });
    });

    describe('toggling between commit box and commit editor', function() {
      it('transfers the commit message contents of the last editor', async function() {
        const wrapper = shallow(app, {disableLifecycleMethods: true});

        wrapper.find('CommitView').prop('toggleExpandedCommitMessageEditor')('message in box');
        await assert.async.equal(workspace.getActiveTextEditor().getPath(), wrapper.instance().getCommitMessagePath());
        wrapper.update();
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
        await assert.async.strictEqual(wrapper.update().find('CommitView').prop('message'), 'message in editor');
      });

      it('activates editor if already opened but in background', async function() {
        const wrapper = shallow(app, {disableLifecycleMethods: true});

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
        const wrapper = shallow(app, {disableLifecycleMethods: true});

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
        await assert.async.strictEqual(wrapper.update().find('CommitView').prop('message'), 'make some new changes');
      });

      describe('openCommitMessageEditor', function() {
        it('records an event', async function() {
          const wrapper = shallow(app, {disableLifecycleMethods: true});

          sinon.stub(reporterProxy, 'addEvent');
          // open expanded commit message editor
          await wrapper.find('CommitView').prop('toggleExpandedCommitMessageEditor')('message in box');
          assert.isTrue(reporterProxy.addEvent.calledWith('open-commit-message-editor', {package: 'github'}));
          // close expanded commit message editor
          reporterProxy.addEvent.reset();
          await wrapper.find('CommitView').prop('toggleExpandedCommitMessageEditor')('message in box');
          assert.isFalse(reporterProxy.addEvent.called);
          // open expanded commit message editor again
          await wrapper.find('CommitView').prop('toggleExpandedCommitMessageEditor')('message in box');
          assert.isTrue(reporterProxy.addEvent.calledWith('open-commit-message-editor', {package: 'github'}));
        });
      });
    });

    describe('committing from commit editor', function() {
      it('uses git commit grammar in the editor', async function() {
        const wrapper = shallow(app, {disableLifecycleMethods: true});
        await atomEnvironment.packages.activatePackage('language-git');
        wrapper.find('CommitView').prop('toggleExpandedCommitMessageEditor')('sup');
        await assert.async.strictEqual(workspace.getActiveTextEditor().getGrammar().scopeName, COMMIT_GRAMMAR_SCOPE);
      });

      it('takes the commit message from the editor and deletes the `ATOM_COMMIT_EDITMSG` file', async function() {
        fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'some changes');
        await repository.stageFiles(['a.txt']);

        app = React.cloneElement(app, {prepareToCommit: () => true, stagedChangesExist: true});
        const wrapper = shallow(app, {disableLifecycleMethods: true});

        wrapper.find('CommitView').prop('toggleExpandedCommitMessageEditor')();
        await assert.async.strictEqual(workspace.getActiveTextEditor().getPath(), wrapper.instance().getCommitMessagePath());

        const editor = workspace.getActiveTextEditor();
        editor.setText('message in editor');
        await editor.save();

        await wrapper.find('CommitView').prop('commit')('message in box');

        assert.strictEqual((await repository.getLastCommit()).getMessageSubject(), 'message in editor');
        assert.isFalse(fs.existsSync(wrapper.instance().getCommitMessagePath()));
        assert.isTrue(commit.calledWith('message in editor', {
          amend: false, coAuthors: [], verbatim: false,
        }));
      });

      it('asks user to confirm if commit editor has unsaved changes', async function() {
        app = React.cloneElement(app, {confirm, prepareToCommit: () => true, stagedChangesExist: true});
        const wrapper = shallow(app, {disableLifecycleMethods: true});

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

    it('delegates focus management to its view', function() {
      const wrapper = mount(app);
      const viewHolder = wrapper.instance().refCommitView;
      assert.isFalse(viewHolder.isEmpty());
      const view = viewHolder.get();

      sinon.spy(view, 'rememberFocus');
      sinon.spy(view, 'setFocus');
      sinon.spy(view, 'hasFocus');
      sinon.spy(view, 'hasFocusEditor');

      wrapper.instance().rememberFocus({target: wrapper.find('atom-text-editor').getDOMNode()});
      assert.isTrue(view.rememberFocus.called);

      wrapper.instance().setFocus(CommitController.focus.EDITOR);
      assert.isTrue(view.setFocus.called);

      wrapper.instance().hasFocus();
      assert.isTrue(view.hasFocus.called);

      wrapper.instance().hasFocusEditor();
      assert.isTrue(view.hasFocusEditor.called);
    });

    it('no-ops focus management methods when the view ref is unassigned', function() {
      const wrapper = shallow(app);
      assert.isTrue(wrapper.instance().refCommitView.isEmpty());

      assert.isNull(wrapper.instance().rememberFocus({}));
      assert.isFalse(wrapper.instance().setFocus(CommitController.focus.EDITOR));
      assert.isFalse(wrapper.instance().hasFocus());
      assert.isFalse(wrapper.instance().hasFocusEditor());
    });
  });
});
