import React from 'react';
import {shallow, mount} from 'enzyme';

import Author from '../../lib/models/author';
import CoAuthorForm from '../../lib/views/co-author-form';
import {cloneRepository, buildRepository} from '../helpers';
import Commit, {nullCommit} from '../../lib/models/commit';
import Branch, {nullBranch} from '../../lib/models/branch';
import ObserveModel from '../../lib/views/observe-model';
import UserStore from '../../lib/models/user-store';
import CommitView from '../../lib/views/commit-view';
import * as reporterProxy from '../../lib/reporter-proxy';

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
    const store = new UserStore({config});

    app = (
      <CommitView
        commandRegistry={commandRegistry}
        tooltips={tooltips}
        config={config}
        lastCommit={lastCommit}
        userStore={store}
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
        updateSelectedCoAuthors={noop}
      />
    );
  });

  afterEach(function() {
    atomEnv.destroy();
  });
  describe('amend', function() {
    it('increments a counter when amend is called', function() {
      const wrapper = shallow(app);
      wrapper.setProps({message: 'yo dawg I heard you like amending'});
      sinon.stub(reporterProxy, 'incrementCounter');
      wrapper.instance().amendLastCommit();

      assert.equal(reporterProxy.incrementCounter.callCount, 1);
    });
  });

  describe('coauthor stuff', function() {
    let wrapper, incrementCounterStub;
    beforeEach(function() {
      wrapper = shallow(app);
      incrementCounterStub = sinon.stub(reporterProxy, 'incrementCounter');
    });
    it('on initial load, renders co-author toggle but not input or form', function() {
      const coAuthorButton = wrapper.find('.github-CommitView-coAuthorToggle');
      assert.deepEqual(coAuthorButton.length, 1);
      assert.isFalse(coAuthorButton.hasClass('focused'));

      const coAuthorInput = wrapper.find('github-CommitView-coAuthorEditor');
      assert.deepEqual(coAuthorInput.length, 0);

      const coAuthorForm = wrapper.find(CoAuthorForm);
      assert.deepEqual(coAuthorForm.length, 0);

      assert.isFalse(incrementCounterStub.called);
    });
    it('renders co-author input when toggle is clicked', function() {
      const coAuthorButton = wrapper.find('.github-CommitView-coAuthorToggle');
      coAuthorButton.simulate('click');

      const coAuthorInput = wrapper.find(ObserveModel);
      assert.deepEqual(coAuthorInput.length, 1);
      assert.isTrue(incrementCounterStub.calledOnce);
      assert.deepEqual(incrementCounterStub.lastCall.args, ['show-co-author-input']);
    });
    it('hides co-author input when toggle is clicked twice', function() {
      const coAuthorButton = wrapper.find('.github-CommitView-coAuthorToggle');
      coAuthorButton.simulate('click');
      coAuthorButton.simulate('click');

      const coAuthorInput = wrapper.find(ObserveModel);
      assert.deepEqual(coAuthorInput.length, 0);
      assert.isTrue(incrementCounterStub.calledTwice);
      assert.deepEqual(incrementCounterStub.lastCall.args, ['hide-co-author-input']);
    });
    it('renders co-author form when a new co-author is added', function() {
      const coAuthorButton = wrapper.find('.github-CommitView-coAuthorToggle');
      coAuthorButton.simulate('click');

      const newAuthor = Author.createNew('pizza@unicorn.party', 'Pizza Unicorn');
      wrapper.instance().onSelectedCoAuthorsChanged([newAuthor]);
      wrapper.update();

      const coAuthorForm = wrapper.find(CoAuthorForm);
      assert.deepEqual(coAuthorForm.length, 1);

      assert.isTrue(incrementCounterStub.calledTwice);
      assert.deepEqual(incrementCounterStub.lastCall.args, ['selected-co-authors-changed']);
    });

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
    assert.strictEqual(wrapper.find('.github-CommitView-remaining-characters').text(), '72');

    wrapper.setProps({message: 'abcde fghij'});
    assert.strictEqual(wrapper.find('.github-CommitView-remaining-characters').text(), '61');
    assert.isFalse(wrapper.find('.github-CommitView-remaining-characters').hasClass('is-error'));
    assert.isFalse(wrapper.find('.github-CommitView-remaining-characters').hasClass('is-warning'));

    wrapper.setProps({message: '\nklmno'});
    assert.strictEqual(wrapper.find('.github-CommitView-remaining-characters').text(), '∞');
    assert.isFalse(wrapper.find('.github-CommitView-remaining-characters').hasClass('is-error'));
    assert.isFalse(wrapper.find('.github-CommitView-remaining-characters').hasClass('is-warning'));

    wrapper.setProps({message: 'abcde\npqrst'});
    assert.strictEqual(wrapper.find('.github-CommitView-remaining-characters').text(), '∞');
    assert.isFalse(wrapper.find('.github-CommitView-remaining-characters').hasClass('is-error'));
    assert.isFalse(wrapper.find('.github-CommitView-remaining-characters').hasClass('is-warning'));

    wrapper.find('atom-text-editor').getDOMNode().getModel().setCursorBufferPosition([0, 3]);
    wrapper.update();
    assert.strictEqual(wrapper.find('.github-CommitView-remaining-characters').text(), '67');
    assert.isFalse(wrapper.find('.github-CommitView-remaining-characters').hasClass('is-error'));
    assert.isFalse(wrapper.find('.github-CommitView-remaining-characters').hasClass('is-warning'));

    wrapper.setProps({stagedChangesExist: true, maximumCharacterLimit: 50});
    assert.strictEqual(wrapper.find('.github-CommitView-remaining-characters').text(), '45');
    assert.isFalse(wrapper.find('.github-CommitView-remaining-characters').hasClass('is-error'));
    assert.isFalse(wrapper.find('.github-CommitView-remaining-characters').hasClass('is-warning'));

    wrapper.setProps({message: 'a'.repeat(41)}).update();
    assert.strictEqual(wrapper.find('.github-CommitView-remaining-characters').text(), '9');
    assert.isFalse(wrapper.find('.github-CommitView-remaining-characters').hasClass('is-error'));
    assert.isTrue(wrapper.find('.github-CommitView-remaining-characters').hasClass('is-warning'));

    wrapper.setProps({message: 'a'.repeat(58)}).update();
    assert.strictEqual(wrapper.find('.github-CommitView-remaining-characters').text(), '-8');
    assert.isTrue(wrapper.find('.github-CommitView-remaining-characters').hasClass('is-error'));
    assert.isFalse(wrapper.find('.github-CommitView-remaining-characters').hasClass('is-warning'));
  });

  describe('the commit button', function() {
    let wrapper;

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
    });

    it('is disabled when no changes are staged', function() {
      wrapper.setProps({stagedChangesExist: false});
      assert.isTrue(wrapper.find('.github-CommitView-commit').prop('disabled'));

      wrapper.setProps({stagedChangesExist: true});
      assert.isFalse(wrapper.find('.github-CommitView-commit').prop('disabled'));
    });

    it('is disabled when there are merge conflicts', function() {
      wrapper.setProps({mergeConflictsExist: true});
      assert.isTrue(wrapper.find('.github-CommitView-commit').prop('disabled'));

      wrapper.setProps({mergeConflictsExist: false});
      assert.isFalse(wrapper.find('.github-CommitView-commit').prop('disabled'));
    });

    it('is disabled when the commit message is empty', function() {
      wrapper.setProps({message: ''}).update();
      assert.isTrue(wrapper.find('.github-CommitView-commit').prop('disabled'));

      wrapper.setProps({message: 'Not empty'}).update();
      assert.isFalse(wrapper.find('.github-CommitView-commit').prop('disabled'));
    });

    it('displays the current branch name', function() {
      const currentBranch = new Branch('aw-do-the-stuff');
      wrapper.setProps({currentBranch});
      assert.strictEqual(wrapper.find('.github-CommitView-commit').text(), 'Commit to aw-do-the-stuff');
    });

    it('indicates when a commit will be detached', function() {
      const currentBranch = Branch.createDetached('master~3');
      wrapper.setProps({currentBranch});
      assert.strictEqual(wrapper.find('.github-CommitView-commit').text(), 'Create detached commit');
    });

    it('displays a progress message while committing', function() {
      wrapper.setState({showWorking: true});
      assert.strictEqual(wrapper.find('.github-CommitView-commit').text(), 'Working...');
    });

    it('falls back to "commit" with no current branch', function() {
      assert.strictEqual(wrapper.find('.github-CommitView-commit').text(), 'Commit');
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

      editorElement = wrapper.find('atom-text-editor').getDOMNode();
      sinon.spy(editorElement, 'focus');
      editor = editorElement.getModel();

      // Perform an extra render to ensure the editor text is reflected in the commit button enablement.
      // The controller accomplishes this by re-rendering on Repository update.
      wrapper.setProps({});

      commitButton = wrapper.find('.github-CommitView-commit');
      workspaceElement = atomEnv.views.getView(atomEnv.workspace);
    });

    describe('when props.prepareToCommit() resolves true', function() {
      beforeEach(function() {
        prepareToCommitResolution = true;
      });

      it('calls props.commit(message) when the commit button is clicked', async function() {
        wrapper.update();
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

  it('detects when the editor has focus', function() {
    const wrapper = mount(app);

    const editorNode = wrapper.find('atom-text-editor').getDOMNode();
    sinon.stub(editorNode, 'contains').returns(true);
    assert.isTrue(wrapper.instance().hasFocusEditor());

    editorNode.contains.returns(false);
    assert.isFalse(wrapper.instance().hasFocusEditor());

    editorNode.contains.returns(true);
    wrapper.instance().refEditor.setter(null);
    assert.isFalse(wrapper.instance().hasFocusEditor());
  });

  it('remembers the current focus', function() {
    const wrapper = mount(React.cloneElement(app, {isMerging: true}));
    wrapper.instance().toggleCoAuthorInput();
    wrapper.update();

    const foci = [
      ['atom-text-editor', CommitView.focus.EDITOR],
      ['.github-CommitView-abortMerge', CommitView.focus.ABORT_MERGE_BUTTON],
      ['.github-CommitView-commit', CommitView.focus.COMMIT_BUTTON],
      ['.github-CommitView-coAuthorEditor input', CommitView.focus.COAUTHOR_INPUT],
    ];
    for (const [selector, focus] of foci) {
      const event = {target: wrapper.find(selector).getDOMNode()};
      assert.strictEqual(wrapper.instance().rememberFocus(event), focus);
    }

    assert.isNull(wrapper.instance().rememberFocus({target: document.body}));

    const holders = [
      'refEditor', 'refAbortMergeButton', 'refCommitButton', 'refCoAuthorSelect',
    ].map(ivar => wrapper.instance()[ivar]);
    for (const holder of holders) {
      holder.setter(null);
    }
    assert.isNull(wrapper.instance().rememberFocus({target: document.body}));
  });

  describe('restoring focus', function() {
    it('to the editor', function() {
      const wrapper = mount(app);
      sinon.spy(wrapper.find('atom-text-editor').getDOMNode(), 'focus');

      assert.isTrue(wrapper.instance().setFocus(CommitView.focus.EDITOR));
      assert.isTrue(wrapper.find('atom-text-editor').getDOMNode().focus.called);
    });

    it('to the abort merge button', function() {
      const wrapper = mount(React.cloneElement(app, {isMerging: true}));
      sinon.spy(wrapper.find('.github-CommitView-abortMerge').getDOMNode(), 'focus');

      assert.isTrue(wrapper.instance().setFocus(CommitView.focus.ABORT_MERGE_BUTTON));
      assert.isTrue(wrapper.find('.github-CommitView-abortMerge').getDOMNode().focus.called);
    });

    it('to the commit button', function() {
      const wrapper = mount(app);
      sinon.spy(wrapper.find('.github-CommitView-commit').getDOMNode(), 'focus');

      assert.isTrue(wrapper.instance().setFocus(CommitView.focus.COMMIT_BUTTON));
      assert.isTrue(wrapper.find('.github-CommitView-commit').getDOMNode().focus.called);
    });

    it('to the co-author input', function() {
      const wrapper = mount(app);
      wrapper.instance().toggleCoAuthorInput();

      sinon.spy(wrapper.update().find('.github-CommitView-coAuthorEditor input').getDOMNode(), 'focus');

      assert.isTrue(wrapper.instance().setFocus(CommitView.focus.COAUTHOR_INPUT));
      assert.isTrue(wrapper.find('.github-CommitView-coAuthorEditor input').getDOMNode().focus.called);
    });

    it('with an unrecognized symbol', function() {
      const wrapper = mount(app);
      assert.isFalse(wrapper.instance().setFocus(Symbol('lolno')));
    });

    it('when the named element is no longer rendered', function() {
      const wrapper = mount(app);
      sinon.spy(wrapper.find('atom-text-editor').getDOMNode(), 'focus');

      assert.isTrue(wrapper.instance().setFocus(CommitView.focus.ABORT_MERGE_BUTTON));
      assert.strictEqual(wrapper.find('atom-text-editor').getDOMNode().focus.callCount, 1);

      assert.isTrue(wrapper.instance().setFocus(CommitView.focus.COAUTHOR_INPUT));
      assert.strictEqual(wrapper.find('atom-text-editor').getDOMNode().focus.callCount, 2);
    });

    it('when refs have not been assigned yet', function() {
      const wrapper = mount(app);

      // Simulate an unmounted component by clearing out RefHolders manually.
      const holders = [
        'refEditor', 'refAbortMergeButton', 'refCommitButton', 'refCoAuthorSelect',
      ].map(ivar => wrapper.instance()[ivar]);
      for (const holder of holders) {
        holder.setter(null);
      }

      for (const focusKey of Object.keys(CommitView.focus)) {
        assert.isFalse(wrapper.instance().setFocus(CommitView.focus[focusKey]));
      }
    });
  });
});
