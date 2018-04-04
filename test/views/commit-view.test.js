import React from 'react';
import {shallow, mount} from 'enzyme';

import {cloneRepository, buildRepository} from '../helpers';
import Commit, {nullCommit} from '../../lib/models/commit';
import Branch, {nullBranch} from '../../lib/models/branch';
import CommitView from '../../lib/views/commit-view';
import {NEW_AUTHOR} from '../../lib/helpers'

describe('CommitView', function() {
  let atomEnv, commandRegistry, tooltips, config, lastCommit;
  let app;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
    commandRegistry = atomEnv.commands;
    tooltips = atomEnv.tooltips;
    config = atomEnv.config;

    lastCommit = new Commit({sha: '1234abcd', message: 'commit message'});
    const noop = () => {};
    const returnTruthyPromise = () => Promise.resolve(true);

    app = (
      <CommitView
        commandRegistry={commandRegistry}
        tooltips={tooltips}
        config={config}
        lastCommit={lastCommit}
        currentBranch={nullBranch}
        isMerging={false}
        stagedChangesExist={false}
        mergeConflictsExist={false}
        isCommitting={false}
        deactivateCommitBox={false}
        maximumCharacterLimit={72}
        message=""
        prepareToCommit={returnTruthyPromise}
        commit={noop}
        abortMerge={noop}
        onChangeMessage={noop}
        toggleExpandedCommitMessageEditor={noop}
      />
    );
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  describe('when the repo is loading', function() {
    beforeEach(function() {
      app = React.cloneElement(app, {lastCommit: nullCommit});
    });

    it('disables the commit button', function() {
      app = React.cloneElement(app, {message: 'even with text'});
      const wrapper = shallow(app);

      assert.isTrue(wrapper.find('.github-CommitView-commit').prop('disabled'));
    });
  });

  it('displays the remaining characters limit based on which line is being edited', function() {
    const wrapper = mount(app);
    const remaining = wrapper.find('.github-CommitView-remaining-characters');
    assert.strictEqual(remaining.text(), '72');

    wrapper.setProps({message: 'abcde fghij'});
    assert.strictEqual(remaining.text(), '61');
    assert.isFalse(remaining.hasClass('is-error'));
    assert.isFalse(remaining.hasClass('is-warning'));

    wrapper.setProps({message: '\nklmno'});
    assert.strictEqual(remaining.text(), '∞');
    assert.isFalse(remaining.hasClass('is-error'));
    assert.isFalse(remaining.hasClass('is-warning'));

    wrapper.setProps({message: 'abcde\npqrst'});
    assert.strictEqual(remaining.text(), '∞');
    assert.isFalse(remaining.hasClass('is-error'));
    assert.isFalse(remaining.hasClass('is-warning'));

    wrapper.find('atom-text-editor').getNode().getModel().setCursorBufferPosition([0, 3]);
    wrapper.update();
    assert.strictEqual(remaining.text(), '67');
    assert.isFalse(remaining.hasClass('is-error'));
    assert.isFalse(remaining.hasClass('is-warning'));

    wrapper.setProps({stagedChangesExist: true, maximumCharacterLimit: 50});
    assert.strictEqual(remaining.text(), '45');
    assert.isFalse(remaining.hasClass('is-error'));
    assert.isFalse(remaining.hasClass('is-warning'));

    wrapper.setProps({message: 'a'.repeat(41)});
    assert.strictEqual(remaining.text(), '9');
    assert.isFalse(remaining.hasClass('is-error'));
    assert.isTrue(remaining.hasClass('is-warning'));

    wrapper.setProps({message: 'a'.repeat(58)});
    assert.strictEqual(wrapper.find('.github-CommitView-remaining-characters').text(), '-8');
    assert.isTrue(wrapper.find('.github-CommitView-remaining-characters').hasClass('is-error'));
    assert.isFalse(wrapper.find('.github-CommitView-remaining-characters').hasClass('is-warning'));
  });

  describe('the commit button', function() {
    let wrapper, commitButton;

    beforeEach(async function() {
      const workdirPath = await cloneRepository('three-files');
      const repository = await buildRepository(workdirPath);

      app = React.cloneElement(app, {
        repository,
        stagedChangesExist: true,
        mergeConflictsExist: false,
        message: 'something',
      });
      wrapper = mount(app);

      commitButton = wrapper.find('.github-CommitView-commit');
    });

    it('is disabled when no changes are staged', function() {
      wrapper.setProps({stagedChangesExist: false});
      assert.isTrue(commitButton.prop('disabled'));

      wrapper.setProps({stagedChangesExist: true});
      assert.isFalse(commitButton.prop('disabled'));
    });

    it('is disabled when there are merge conflicts', function() {
      wrapper.setProps({mergeConflictsExist: true});
      assert.isTrue(commitButton.prop('disabled'));

      wrapper.setProps({mergeConflictsExist: false});
      assert.isFalse(commitButton.prop('disabled'));
    });

    it('is disabled when the commit message is empty', function() {
      wrapper.setProps({message: ''});
      assert.isTrue(commitButton.prop('disabled'));

      wrapper.setProps({message: 'Not empty'});
      assert.isFalse(commitButton.prop('disabled'));
    });

    it('displays the current branch name', function() {
      const currentBranch = new Branch('aw-do-the-stuff');
      wrapper.setProps({currentBranch});
      assert.strictEqual(commitButton.text(), 'Commit to aw-do-the-stuff');
    });

    it('indicates when a commit will be detached', function() {
      const currentBranch = Branch.createDetached('master~3');
      wrapper.setProps({currentBranch});
      assert.strictEqual(commitButton.text(), 'Create detached commit');
    });

    it('displays a progress message while committing', function() {
      wrapper.setState({showWorking: true});
      assert.strictEqual(commitButton.text(), 'Working...');
    });

    it('falls back to "commit" with no current branch', function() {
      assert.strictEqual(commitButton.text(), 'Commit');
    });
  });

  describe('committing', function() {
    let commit, prepareToCommitResolution;
    let wrapper, editorElement, editor, commitButton, workspaceElement;

    beforeEach(function() {
      const prepareToCommit = () => Promise.resolve(prepareToCommitResolution);

      commit = sinon.spy();
      app = React.cloneElement(app, {stagedChangesExist: true, prepareToCommit, commit, message: 'Something'});
      wrapper = mount(app);

      editorElement = wrapper.find('atom-text-editor').getNode();
      sinon.spy(editorElement, 'focus');
      editor = editorElement.getModel();

      // Perform an extra render to ensure the editor text is reflected in the commit button enablement.
      // The controller accomplishes this by re-rendering on Repository update.
      wrapper.update();

      commitButton = wrapper.find('.github-CommitView-commit');

      workspaceElement = atomEnv.views.getView(atomEnv.workspace);
    });

    describe('when props.prepareToCommit() resolves true', function() {
      beforeEach(function() {
        prepareToCommitResolution = true;
      });

      it('calls props.commit(message) when the commit button is clicked', async function() {
        commitButton.simulate('click');

        await assert.async.isTrue(commit.calledWith('Something'));

        // undo history is cleared
        commandRegistry.dispatch(editorElement, 'core:undo');
        assert.equal(editor.getText(), '');
      });

      it('calls props.commit(message) when github:commit is dispatched', async function() {
        commandRegistry.dispatch(workspaceElement, 'github:commit');

        await assert.async.isTrue(commit.calledWith('Something'));
      });
    });

    describe('when props.prepareToCommit() resolves false', function() {
      beforeEach(function() {
        prepareToCommitResolution = false;
      });

      it('takes no further action when the commit button is clicked', async function() {
        commitButton.simulate('click');

        await assert.async.isTrue(editorElement.focus.called);
        assert.isFalse(commit.called);
      });

      it('takes no further action when github:commit is dispatched', async function() {
        commandRegistry.dispatch(workspaceElement, 'github:commit');

        await assert.async.isTrue(editorElement.focus.called);
        assert.isFalse(commit.called);
      });
    });
  });

  it('shows the "Abort Merge" button when props.isMerging is true', function() {
    app = React.cloneElement(app, {isMerging: true});
    const wrapper = shallow(app);
    assert.isTrue(wrapper.find('.github-CommitView-abortMerge').exists());

    wrapper.setProps({isMerging: false});
    assert.isFalse(wrapper.find('.github-CommitView-abortMerge').exists());
  });

  it('calls props.abortMerge() when the "Abort Merge" button is clicked', function() {
    const abortMerge = sinon.stub().resolves();
    app = React.cloneElement(app, {abortMerge, stagedChangesExist: true, isMerging: true});
    const wrapper = shallow(app);

    wrapper.find('.github-CommitView-abortMerge').simulate('click');
    assert.isTrue(abortMerge.calledOnce);
  });

  describe('co-authors', function() {
    it('"New Author" should be the first suggested author', function() {
      const mentionableUsers = [{name: 'octocat@github.com', email: 'Mona Lisa'}];
      app = React.cloneElement(app, {mentionableUsers});
      const wrapper = mount(app);
      wrapper.setState({showCoAuthorInput: true});
      const listOptions = wrapper.find('Select').getNode().props.options;
      mentionableUsers.unshift(NEW_AUTHOR);
      assert.deepEqual(listOptions, mentionableUsers);
    });
  });
});
