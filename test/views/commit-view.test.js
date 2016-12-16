/** @babel */

import {cloneRepository, buildRepository} from '../helpers';
import etch from 'etch';

import CommitView from '../../lib/views/commit-view';

describe('CommitView', () => {
  let atomEnv, commandRegistry;

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

  it('calls props.commit(message) when the commit button is clicked or github:commit is dispatched', async () => {
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

    // commit via the github:commit command
    commit.reset();
    await view.update({stagedChangesExist: true, message: 'Commit 2'});
    commandRegistry.dispatch(editor.element, 'github:commit');
    assert.equal(commit.args[0][0], 'Commit 2');

    // disable github:commit when there are no staged changes...
    commit.reset();
    await view.update({stagedChangesExist: false, message: 'Commit 4'});
    commandRegistry.dispatch(editor.element, 'github:commit');
    assert.equal(commit.callCount, 0);

    // ...or the commit message is empty
    commit.reset();
    await view.update({stagedChangesExist: true, message: ''});
    commandRegistry.dispatch(editor.element, 'github:commit');
    assert.equal(commit.callCount, 0);
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

  it('calls props.abortMerge() when the "Abort Merge" button is clicked', () => {
    const abortMerge = sinon.spy(() => Promise.resolve());
    const view = new CommitView({commandRegistry, stagedChangesExist: true, isMerging: true, abortMerge});
    const {abortMergeButton} = view.refs;
    abortMergeButton.dispatchEvent(new MouseEvent('click'));
    assert(abortMerge.calledOnce);
  });

  describe('amending', () => {
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
});
