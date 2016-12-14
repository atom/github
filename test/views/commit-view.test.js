/** @babel */

import {cloneRepository, buildRepository} from '../helpers';
import etch from 'etch';
import sinon from 'sinon';

import CommitView from '../../lib/views/commit-view';
import {AbortMergeError, CommitError} from '../../lib/models/repository';

describe('CommitView', () => {
  let atomEnv, commandRegistry, notificationManager;

  beforeEach(() => {
    atomEnv = global.buildAtomEnvironment();
    commandRegistry = atomEnv.commands;
  });

  afterEach(() => {
    atomEnv.destroy();
  });

  it('displays the remaining characters limit based on which line is being edited', async () => {
    const view = new CommitView({commandRegistry, stagedChangesExist: true, maximumCharacterLimit: 72, message: ''});
    assert.equal(view.refs.remainingCharacters.textContent, '72');

    await view.update({message: 'abcde fghij'});
    assert.equal(view.refs.remainingCharacters.textContent, '61');
    assert(!view.refs.remainingCharacters.classList.contains('is-error'));
    assert(!view.refs.remainingCharacters.classList.contains('is-warning'));

    await view.update({message: '\nklmno'});
    assert.equal(view.refs.remainingCharacters.textContent, '∞');
    assert(!view.refs.remainingCharacters.classList.contains('is-error'));
    assert(!view.refs.remainingCharacters.classList.contains('is-warning'));

    await view.update({message: 'abcde\npqrst'});
    assert.equal(view.refs.remainingCharacters.textContent, '∞');
    assert(!view.refs.remainingCharacters.classList.contains('is-error'));
    assert(!view.refs.remainingCharacters.classList.contains('is-warning'));

    view.editor.setCursorBufferPosition([0, 3]);
    await etch.getScheduler().getNextUpdatePromise();
    assert.equal(view.refs.remainingCharacters.textContent, '67');
    assert(!view.refs.remainingCharacters.classList.contains('is-error'));
    assert(!view.refs.remainingCharacters.classList.contains('is-warning'));

    await view.update({stagedChangesExist: true, maximumCharacterLimit: 50});
    assert.equal(view.refs.remainingCharacters.textContent, '45');
    assert(!view.refs.remainingCharacters.classList.contains('is-error'));
    assert(!view.refs.remainingCharacters.classList.contains('is-warning'));

    await view.update({message: 'a'.repeat(41)});
    assert.equal(view.refs.remainingCharacters.textContent, '9');
    assert(!view.refs.remainingCharacters.classList.contains('is-error'));
    assert(view.refs.remainingCharacters.classList.contains('is-warning'));

    await view.update({message: 'a'.repeat(58)});
    assert.equal(view.refs.remainingCharacters.textContent, '-8');
    assert(view.refs.remainingCharacters.classList.contains('is-error'));
    assert(!view.refs.remainingCharacters.classList.contains('is-warning'));
  });

  it('uses the git commit message grammar when the grammar is loaded', async () => {
    await atom.packages.activatePackage('language-git');

    const view = new CommitView({commandRegistry});
    assert.equal(view.editor.getGrammar().scopeName, 'text.git-commit');
  });

  it('uses the git commit message grammar when the grammar has not been loaded', async () => {
    atom.packages.deactivatePackage('language-git');

    const view = new CommitView({commandRegistry});
    assert(view.editor.getGrammar().scopeName.startsWith('text.plain'));

    await atom.packages.activatePackage('language-git');

    assert.equal(view.editor.getGrammar().scopeName, 'text.git-commit');
  });

  it('disables the commit button when no changes are staged, there are merge conflict files, or the commit message is empty', async () => {
    const workdirPath = await cloneRepository('three-files');
    const repository = await buildRepository(workdirPath);
    const viewState = {};
    const view = new CommitView({repository, commandRegistry, stagedChangesExist: false, viewState});
    const {editor, commitButton} = view.refs;
    assert.isTrue(commitButton.disabled);

    editor.setText('something');
    await etch.getScheduler().getNextUpdatePromise();
    assert.isTrue(commitButton.disabled);

    await view.update({stagedChangesExist: true});
    assert.isFalse(commitButton.disabled);

    await view.update({mergeConflictsExist: true});
    assert.isTrue(commitButton.disabled);

    await view.update({mergeConflictsExist: false});
    assert.isFalse(commitButton.disabled);

    editor.setText('');
    await etch.getScheduler().getNextUpdatePromise();
    assert.isTrue(commitButton.disabled);
  });

  it('calls props.commit(message) when the commit button is clicked or git:commit is dispatched', async () => {
    const commit = sinon.spy();
    const view = new CommitView({commandRegistry, stagedChangesExist: false, commit, message: ''});
    const {editor, commitButton} = view.refs;

    // commit by clicking the commit button
    await view.update({stagedChangesExist: true, message: 'Commit 1'});
    commitButton.dispatchEvent(new MouseEvent('click'));
    assert.equal(commit.args[0][0], 'Commit 1');

    // undo history is cleared
    commandRegistry.dispatch(editor.element, 'core:undo');
    assert.equal(editor.getText(), '');

    // commit via the git:commit command
    commit.reset();
    await view.update({stagedChangesExist: true, message: 'Commit 2'});
    commandRegistry.dispatch(editor.element, 'git:commit');
    assert.equal(commit.args[0][0], 'Commit 2');

    // disable git:commit when there are no staged changes...
    commit.reset();
    await view.update({stagedChangesExist: false, message: 'Commit 4'});
    commandRegistry.dispatch(editor.element, 'git:commit');
    assert.equal(commit.callCount, 0);

    // ...or the commit message is empty
    commit.reset();
    await view.update({stagedChangesExist: true, message: ''});
    commandRegistry.dispatch(editor.element, 'git:commit');
    assert.equal(commit.callCount, 0);
  });

  // FIXME: move to git panel controller
  xit('shows an error notification when props.commit() throws an ECONFLICT exception', async () => {
    const commit = sinon.spy(async () => {
      await Promise.resolve();
      throw new CommitError('ECONFLICT');
    });
    const view = new CommitView({commandRegistry, notificationManager, stagedChangesExist: true, commit});
    const {editor, commitButton} = view.refs;
    editor.setText('A message.');
    await etch.getScheduler().getNextUpdatePromise();
    assert.equal(notificationManager.getNotifications().length, 0);
    commitButton.dispatchEvent(new MouseEvent('click'));
    await etch.getScheduler().getNextUpdatePromise();
    assert(commit.calledOnce);
    assert.equal(editor.getText(), 'A message.');
    assert.equal(notificationManager.getNotifications().length, 1);
  });

  // FIXME: this only makes sense in the context of a commitViewController test
  xit('replaces the contents of the commit message when it is empty and a message is supplied from the outside', async () => {
    const workdirPath = await cloneRepository('three-files');
    const repository = await buildRepository(workdirPath);
    const viewState = {};
    const view = new CommitView({repository, commandRegistry, stagedChangesExist: true, maximumCharacterLimit: 72, viewState});
    const {editor} = view.refs;
    editor.setText('message 1');
    await etch.getScheduler().getNextUpdatePromise();
    assert.equal(editor.getText(), 'message 1');

    await view.update({message: 'Merge conflict!'});
    assert.equal(editor.getText(), 'message 1');

    editor.setText('');
    await etch.getScheduler().getNextUpdatePromise();
    await view.update({message: 'Merge conflict!'});
    assert.equal(editor.getText(), 'Merge conflict!');
  });

  it('shows the "Abort Merge" button when props.isMerging is true', async () => {
    const view = new CommitView({commandRegistry, stagedChangesExist: true, isMerging: false});
    const {abortMergeButton} = view.refs;
    assert.equal(abortMergeButton.style.display, 'none');

    await view.update({isMerging: true});
    assert.equal(abortMergeButton.style.display, '');

    await view.update({isMerging: false});
    assert.equal(abortMergeButton.style.display, 'none');
  });

  // FIXME: we should test elsewhere that this clears the mergeMessage prop to commitViewController
  it('calls props.abortMerge() when the "Abort Merge" button is clicked', () => { // and then clears the commit message', async () => {
    const abortMerge = sinon.spy(() => Promise.resolve());
    const view = new CommitView({commandRegistry, stagedChangesExist: true, isMerging: true, abortMerge});
    const {abortMergeButton} = view.refs;
    abortMergeButton.dispatchEvent(new MouseEvent('click'));
    assert(abortMerge.calledOnce);
  });

  // FIXME: this needs to go elsewhere, e.g. gitPanelController
  xit('shows an error notification when props.abortMerge() throws an EDIRTYSTAGED exception', async () => {
    const abortMerge = sinon.spy(async () => {
      await Promise.resolve();
      throw new AbortMergeError('EDIRTYSTAGED', 'a.txt');
    });
    const view = new CommitView({commandRegistry, notificationManager, stagedChangesExist: true, isMerging: true, abortMerge});
    const {editor, abortMergeButton} = view.refs;
    editor.setText('A message.');
    assert.equal(notificationManager.getNotifications().length, 0);
    abortMergeButton.dispatchEvent(new MouseEvent('click'));
    await etch.getScheduler().getNextUpdatePromise();
    assert(abortMerge.calledOnce);
    assert.equal(editor.getText(), 'A message.');
    assert.equal(notificationManager.getNotifications().length, 1);
  });

  describe('amending', () => {
    // FIXME: move somewhere else
    xit('displays the appropriate commit message and sets the cursor to the beginning of the text', async () => {
      const workdirPath = await cloneRepository('three-files');
      const repository = await buildRepository(workdirPath);
      const viewState = {};
      const view = new CommitView({repository, commandRegistry, stagedChangesExist: false, lastCommit: {message: 'previous commit\'s message'}, viewState});
      const {editor, amend} = view.refs;

      editor.setText('some commit message');
      assert.isFalse(amend.checked);
      assert.equal(editor.getText(), 'some commit message');

      // displays message for last commit
      amend.click();
      assert.isTrue(amend.checked);
      assert.equal(editor.getText(), 'previous commit\'s message');
      assert.deepEqual(editor.getCursorBufferPosition().serialize(), [0, 0]);

      // restores original message
      amend.click();
      assert.isFalse(amend.checked);
      assert.equal(editor.getText(), 'some commit message');
      assert.deepEqual(editor.getCursorBufferPosition().serialize(), [0, 0]);
    });

    // FIXME: move
    xit('clears the amend checkbox after committing', async () => {
      const workdirPath = await cloneRepository('three-files');
      const repository = await buildRepository(workdirPath);
      const view = new CommitView({commandRegistry, stagedChangesExist: false});
      const {amend} = view.refs;
      await view.update({repository, stagedChangesExist: true});
      assert.isFalse(amend.checked);
      amend.click();
      assert.isTrue(amend.checked);
      await view.commit();
      assert.isFalse(amend.checked);
    });

    it('calls props.setAmending() when the box is checked or unchecked', () => {
      const setAmending = sinon.spy();
      const view = new CommitView({commandRegistry, stagedChangesExist: false, lastCommit: {message: 'previous commit\'s message'}, setAmending});
      const {amend} = view.refs;

      amend.click();
      assert.deepEqual(setAmending.args, [[true]]);

      amend.click();
      assert.deepEqual(setAmending.args, [[true], [false]]);
    });
  });

  // FIXME: move to commit view controller
  xdescribe('when switching between repositories', () => {
    it('retains the commit message and cursor location', async () => {
      const workdirPath1 = await cloneRepository('multiple-commits');
      const repository1 = await buildRepository(workdirPath1);
      const workdirPath2 = await cloneRepository('three-files');
      const repository2 = await buildRepository(workdirPath2);

      const viewStateForRepo1 = {};
      const viewStateForRepo2 = {};

      let viewForRepo1 = new CommitView({repository: repository1, commandRegistry, stagedChangesExist: true, viewState: viewStateForRepo1});
      let editor = viewForRepo1.refs.editor;

      const repository1Message = 'commit message for first repo\nsome details about the commit\nmore details';
      editor.setText(repository1Message);
      const repository1CursorPosition = [1, 3];
      editor.setCursorBufferPosition(repository1CursorPosition);
      await etch.getScheduler().getNextUpdatePromise();
      assert.equal(editor.getText(), repository1Message);
      assert.deepEqual(editor.getCursorBufferPosition().serialize(), repository1CursorPosition);

      let viewForRepo2 = new CommitView({repository: repository2, commandRegistry, stagedChangesExist: true, viewState: viewStateForRepo2});
      editor = viewForRepo2.refs.editor;
      assert.equal(editor.getText(), '');

      const repository2Message = 'commit message for second repo';
      editor.setText(repository2Message);
      const repository2CursorPosition = [0, 10];
      editor.setCursorBufferPosition(repository2CursorPosition);
      await etch.getScheduler().getNextUpdatePromise();
      assert.equal(editor.getText(), repository2Message);
      assert.deepEqual(editor.getCursorBufferPosition().serialize(), repository2CursorPosition);

      // when repository1 is selected, restore its state
      viewForRepo1 = new CommitView({repository: repository1, commandRegistry, stagedChangesExist: true, viewState: viewStateForRepo1});
      editor = viewForRepo1.refs.editor;
      assert.equal(editor.getText(), repository1Message);
      assert.deepEqual(editor.getCursorBufferPosition().serialize(), repository1CursorPosition);

      // when repository2 is selected, restore its state
      viewForRepo2 = new CommitView({repository: repository2, commandRegistry, stagedChangesExist: true, viewState: viewStateForRepo2});
      editor = viewForRepo2.refs.editor;
      assert.equal(editor.getText(), repository2Message);
      assert.deepEqual(editor.getCursorBufferPosition().serialize(), repository2CursorPosition);
    });

    it('retains the amend status and restores the correct commit message when amend state is exited', async () => {
      const workdirPath1 = await cloneRepository('multiple-commits');
      const repository1 = await buildRepository(workdirPath1);
      const workdirPath2 = await cloneRepository('three-files');
      const repository2 = await buildRepository(workdirPath2);

      const repository1LastCommit = {message: 'first repository\'s previous commit\'s message'};
      const repository2LastCommit = {message: 'second repository\'s previous commit\'s message'};
      const viewStateForRepo1 = {};
      const viewStateForRepo2 = {};

      const view = new CommitView({repository: repository1, lastCommit: repository1LastCommit, commandRegistry, stagedChangesExist: true, viewState: viewStateForRepo1});
      const {editor, amend} = view.refs;

      // create message for repository1
      const repository1Message = 'commit message for first repo\nsome details about the commit\nmore details';
      editor.setText(repository1Message);
      await etch.getScheduler().getNextUpdatePromise();

      // put repository1 in amend state, commit message changes to that of the last commit
      amend.click();
      await etch.getScheduler().getNextUpdatePromise();
      assert.isTrue(amend.checked);
      assert.equal(editor.getText(), repository1LastCommit.message);

      // when repository2 is selected, restore to initial state of unchecked amend box and empty commit message
      await view.update({repository: repository2, lastCommit: repository2LastCommit, viewState: viewStateForRepo2});
      assert.isFalse(amend.checked);
      assert.equal(editor.getText(), '');

      // create commit message for repository2
      const repository2Message = 'commit message for second repo';
      editor.setText(repository2Message);
      await etch.getScheduler().getNextUpdatePromise();
      assert.isFalse(amend.checked);
      assert.equal(editor.getText(), repository2Message);

      // put repository2 in amend state, commit message changes to that of the last commit
      amend.click();
      await etch.getScheduler().getNextUpdatePromise();
      assert.isTrue(amend.checked);
      assert.equal(editor.getText(), repository2LastCommit.message);

      // when repository1 is selected, restore its state
      await view.update({repository: repository1, viewState: viewStateForRepo1});
      assert.isTrue(amend.checked);
      assert.equal(editor.getText(), repository1LastCommit.message);

      // exit amend state and restore original message for repository1
      amend.click();
      assert.isFalse(amend.checked);
      assert.equal(editor.getText(), repository1Message);

      // when repository2 is selected, restore its state
      await view.update({repository: repository2, viewState: viewStateForRepo2});
      assert.isTrue(amend.checked);
      assert.equal(editor.getText(), repository2LastCommit.message);

      // exit amend state and restore original message for repository2
      amend.click();
      assert.isFalse(amend.checked);
      assert.equal(editor.getText(), repository2Message);
    });
  });
});
