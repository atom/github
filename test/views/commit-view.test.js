/** @babel */

import {cloneRepository, buildRepository} from '../helpers'
import etch from 'etch'
import sinon from 'sinon'

import CommitView from '../../lib/views/commit-view'
import {AbortMergeError, CommitError} from '../../lib/models/repository'

describe('CommitView', () => {
  let atomEnv, workspace, commandRegistry, notificationManager, confirmChoice

  beforeEach(() => {
    atomEnv = global.buildAtomEnvironment()
    workspace = atomEnv.workspace
    commandRegistry = atomEnv.commands
    notificationManager = atomEnv.notifications
    confirmChoice = 0
    sinon.stub(atom, 'confirm', () => confirmChoice)
  })

  afterEach(() => {
    atomEnv.destroy()
    atom.confirm.restore()
  })

  it('displays the remaining characters limit based on which line is being edited', async () => {
    const workdirPath = await cloneRepository('three-files')
    const repository = await buildRepository(workdirPath)
    const viewState = {}
    const view = new CommitView({workspace, repository, commandRegistry, stagedChangesExist: true, maximumCharacterLimit: 72, viewState})
    const {editor} = view.refs
    assert.equal(view.refs.remainingCharacters.textContent, '72')

    editor.insertText('abcde fghij')
    await etch.getScheduler().getNextUpdatePromise()
    assert.equal(view.refs.remainingCharacters.textContent, '61')
    assert(!view.refs.remainingCharacters.classList.contains('is-error'))
    assert(!view.refs.remainingCharacters.classList.contains('is-warning'))

    editor.insertText('\nklmno')
    await etch.getScheduler().getNextUpdatePromise()
    assert.equal(view.refs.remainingCharacters.textContent, '∞')
    assert(!view.refs.remainingCharacters.classList.contains('is-error'))
    assert(!view.refs.remainingCharacters.classList.contains('is-warning'))

    editor.insertText('\npqrst')
    await etch.getScheduler().getNextUpdatePromise()
    assert.equal(view.refs.remainingCharacters.textContent, '∞')
    assert(!view.refs.remainingCharacters.classList.contains('is-error'))
    assert(!view.refs.remainingCharacters.classList.contains('is-warning'))

    editor.setCursorBufferPosition([0, 3])
    await etch.getScheduler().getNextUpdatePromise()
    assert.equal(view.refs.remainingCharacters.textContent, '61')
    assert(!view.refs.remainingCharacters.classList.contains('is-error'))
    assert(!view.refs.remainingCharacters.classList.contains('is-warning'))

    await view.update({stagedChangesExist: true, maximumCharacterLimit: 50})
    assert.equal(view.refs.remainingCharacters.textContent, '39')
    assert(!view.refs.remainingCharacters.classList.contains('is-error'))
    assert(!view.refs.remainingCharacters.classList.contains('is-warning'))

    editor.insertText('abcde fghij klmno pqrst uvwxyz')
    await etch.getScheduler().getNextUpdatePromise()
    assert.equal(view.refs.remainingCharacters.textContent, '9')
    assert(!view.refs.remainingCharacters.classList.contains('is-error'))
    assert(view.refs.remainingCharacters.classList.contains('is-warning'))

    editor.insertText('ABCDE FGHIJ KLMNO')
    await etch.getScheduler().getNextUpdatePromise()
    assert.equal(view.refs.remainingCharacters.textContent, '-8')
    assert(view.refs.remainingCharacters.classList.contains('is-error'))
    assert(!view.refs.remainingCharacters.classList.contains('is-warning'))
  })

  it('disables the commit button when no changes are staged, there are merge conflict files, or the commit message is empty', async () => {
    const workdirPath = await cloneRepository('three-files')
    const repository = await buildRepository(workdirPath)
    const viewState = {}
    const view = new CommitView({workspace, repository, commandRegistry, stagedChangesExist: false, viewState})
    const {editor, commitButton} = view.refs
    assert.isTrue(commitButton.disabled)

    editor.setText('something')
    await etch.getScheduler().getNextUpdatePromise()
    assert.isTrue(commitButton.disabled)

    await view.update({stagedChangesExist: true})
    assert.isFalse(commitButton.disabled)

    await view.update({mergeConflictsExist: true})
    assert.isTrue(commitButton.disabled)

    await view.update({mergeConflictsExist: false})
    assert.isFalse(commitButton.disabled)

    editor.setText('')
    await etch.getScheduler().getNextUpdatePromise()
    assert.isTrue(commitButton.disabled)
  })

  it('calls props.commit(message) when the commit button is clicked or git:commit is dispatched', async () => {
    const workdirPath = await cloneRepository('three-files')
    const repository = await buildRepository(workdirPath)
    const commit = sinon.spy()
    const view = new CommitView({workspace, commandRegistry, stagedChangesExist: false, commit})
    const {editor, commitButton} = view.refs

    // commit by clicking the commit button
    await view.update({repository, stagedChangesExist: true})
    editor.setText('Commit 1')
    await etch.getScheduler().getNextUpdatePromise()
    commitButton.dispatchEvent(new MouseEvent('click'))
    await etch.getScheduler().getNextUpdatePromise()
    assert.equal(commit.args[0][0], 'Commit 1')
    assert.equal(editor.getText(), '')

    // commit via the git:commit command
    commit.reset()
    await view.update({repository, stagedChangesExist: true})
    editor.setText('Commit 2')
    await etch.getScheduler().getNextUpdatePromise()
    commandRegistry.dispatch(editor.element, 'git:commit')
    await etch.getScheduler().getNextUpdatePromise()
    assert.equal(commit.args[0][0], 'Commit 2')
    assert.equal(editor.getText(), '')

    // disable git:commit when there are no staged changes...
    commit.reset()
    await view.update({repository, stagedChangesExist: false})
    editor.setText('Commit 4')
    await etch.getScheduler().getNextUpdatePromise()
    commandRegistry.dispatch(editor.element, 'git:commit')
    await etch.getScheduler().getNextUpdatePromise()
    assert.equal(commit.callCount, 0)
    assert.equal(editor.getText(), 'Commit 4')

    // ...or the commit message is empty
    commit.reset()
    editor.setText('')
    await etch.getScheduler().getNextUpdatePromise()
    await view.update({repository, stagedChangesExist: true})
    commandRegistry.dispatch(editor.element, 'git:commit')
    await etch.getScheduler().getNextUpdatePromise()
    assert.equal(commit.callCount, 0)
  })

  it('shows an error notification when props.commit() throws an ECONFLICT exception', async () => {
    const commit = sinon.spy(async () => {
      await Promise.resolve()
      throw new CommitError('ECONFLICT')
    })
    const view = new CommitView({workspace, commandRegistry, notificationManager, stagedChangesExist: true, commit})
    const {editor, commitButton} = view.refs
    editor.setText('A message.')
    await etch.getScheduler().getNextUpdatePromise()
    assert.equal(notificationManager.getNotifications().length, 0)
    commitButton.dispatchEvent(new MouseEvent('click'))
    await etch.getScheduler().getNextUpdatePromise()
    assert(commit.calledOnce)
    assert.equal(editor.getText(), 'A message.')
    assert.equal(notificationManager.getNotifications().length, 1)
  })

  it('replaces the contents of the commit message when it is empty and a message is supplied from the outside', async () => {
    const workdirPath = await cloneRepository('three-files')
    const repository = await buildRepository(workdirPath)
    const viewState = {}
    const view = new CommitView({workspace, repository, commandRegistry, stagedChangesExist: true, maximumCharacterLimit: 72, viewState})
    const {editor} = view.refs
    editor.setText('message 1')
    await etch.getScheduler().getNextUpdatePromise()
    assert.equal(editor.getText(), 'message 1')

    await view.update({message: 'Merge conflict!'})
    assert.equal(editor.getText(), 'message 1')

    editor.setText('')
    await etch.getScheduler().getNextUpdatePromise()
    await view.update({message: 'Merge conflict!'})
    assert.equal(editor.getText(), 'Merge conflict!')
  })

  it('shows the "Abort Merge" button when props.isMerging is true', async () => {
    const view = new CommitView({workspace, commandRegistry, stagedChangesExist: true, isMerging: false})
    const {abortMergeButton} = view.refs
    assert.equal(abortMergeButton.style.display, 'none')

    await view.update({isMerging: true})
    assert.equal(abortMergeButton.style.display, '')

    await view.update({isMerging: false})
    assert.equal(abortMergeButton.style.display, 'none')
  })

  it('calls props.abortMerge() when the "Abort Merge" button is clicked and then clears the commit message', async () => {
    const abortMerge = sinon.spy(() => Promise.resolve())
    const view = new CommitView({workspace, commandRegistry, stagedChangesExist: true, isMerging: true, abortMerge})
    const {editor, abortMergeButton} = view.refs
    editor.setText('A message.')
    abortMergeButton.dispatchEvent(new MouseEvent('click'))
    await etch.getScheduler().getNextUpdatePromise()
    assert(abortMerge.calledOnce)
    assert.equal(editor.getText(), '')
  })

  it('shows an error notification when props.abortMerge() throws an EDIRTYSTAGED exception', async () => {
    const abortMerge = sinon.spy(async () => {
      await Promise.resolve()
      throw new AbortMergeError('EDIRTYSTAGED', 'a.txt')
    })
    const view = new CommitView({workspace, commandRegistry, notificationManager, stagedChangesExist: true, isMerging: true, abortMerge})
    const {editor, abortMergeButton} = view.refs
    editor.setText('A message.')
    assert.equal(notificationManager.getNotifications().length, 0)
    abortMergeButton.dispatchEvent(new MouseEvent('click'))
    await etch.getScheduler().getNextUpdatePromise()
    assert(abortMerge.calledOnce)
    assert.equal(editor.getText(), 'A message.')
    assert.equal(notificationManager.getNotifications().length, 1)
  })

  describe('amending', () => {
    it('displays the appropriate commit message and sets the cursor to the beginning of the text', async () => {
      const workdirPath = await cloneRepository('three-files')
      const repository = await buildRepository(workdirPath)
      const viewState = {}
      const view = new CommitView({workspace, repository, commandRegistry, stagedChangesExist: false, lastCommit: {message: 'previous commit\'s message'}, viewState})
      const {editor, amend} = view.refs

      editor.setText('some commit message')
      assert.isFalse(amend.checked)
      assert.equal(editor.getText(), 'some commit message')

      // displays message for last commit
      amend.click()
      assert.isTrue(amend.checked)
      assert.equal(editor.getText(), 'previous commit\'s message')
      assert.deepEqual(editor.getCursorBufferPosition().serialize(), [0, 0])

      // restores original message
      amend.click()
      assert.isFalse(amend.checked)
      assert.equal(editor.getText(), 'some commit message')
      assert.deepEqual(editor.getCursorBufferPosition().serialize(), [0, 0])
    })

    it('clears the amend checkbox after committing', async () => {
      const workdirPath = await cloneRepository('three-files')
      const repository = await buildRepository(workdirPath)
      const view = new CommitView({workspace, commandRegistry, stagedChangesExist: false})
      const {amend} = view.refs
      await view.update({repository, stagedChangesExist: true})
      assert.isFalse(amend.checked)
      amend.click()
      assert.isTrue(amend.checked)
      await view.commit()
      assert.isFalse(amend.checked)
    })

    it('calls props.setAmending() when the box is checked or unchecked', async function () {
      const setAmending = sinon.spy()
      const workdirPath = await cloneRepository('three-files')
      const repository = await buildRepository(workdirPath)
      const view = new CommitView({workspace, commandRegistry, stagedChangesExist: false, lastCommit: {message: 'previous commit\'s message'}, setAmending})
      const {editor, amend} = view.refs

      amend.click()
      assert.deepEqual(setAmending.args, [[true]])

      amend.click()
      assert.deepEqual(setAmending.args, [[true], [false]])
    })
  })

  describe('when switching between repositories', () => {
    it('retains the commit message and cursor location', async () => {
      const workdirPath1 = await cloneRepository('multiple-commits')
      const repository1 = await buildRepository(workdirPath1)
      const workdirPath2 = await cloneRepository('three-files')
      const repository2 = await buildRepository(workdirPath2)

      const viewStateForRepo1 = {}
      const viewStateForRepo2 = {}

      let viewForRepo1 = new CommitView({workspace, repository: repository1, commandRegistry, stagedChangesExist: true, viewState: viewStateForRepo1})
      let editor = viewForRepo1.refs.editor

      const repository1Message = 'commit message for first repo\nsome details about the commit\nmore details'
      editor.setText(repository1Message)
      const repository1CursorPosition = [1, 3]
      editor.setCursorBufferPosition(repository1CursorPosition)
      await etch.getScheduler().getNextUpdatePromise()
      assert.equal(editor.getText(), repository1Message)
      assert.deepEqual(editor.getCursorBufferPosition().serialize(), repository1CursorPosition)

      let viewForRepo2 = new CommitView({workspace, repository: repository2, commandRegistry, stagedChangesExist: true, viewState: viewStateForRepo2})
      editor = viewForRepo2.refs.editor
      assert.equal(editor.getText(), '')

      const repository2Message = 'commit message for second repo'
      editor.setText(repository2Message)
      const repository2CursorPosition = [0, 10]
      editor.setCursorBufferPosition(repository2CursorPosition)
      await etch.getScheduler().getNextUpdatePromise()
      assert.equal(editor.getText(), repository2Message)
      assert.deepEqual(editor.getCursorBufferPosition().serialize(), repository2CursorPosition)

      // when repository1 is selected, restore its state
      viewForRepo1 = new CommitView({workspace, repository: repository1, commandRegistry, stagedChangesExist: true, viewState: viewStateForRepo1})
      editor = viewForRepo1.refs.editor
      assert.equal(editor.getText(), repository1Message)
      assert.deepEqual(editor.getCursorBufferPosition().serialize(), repository1CursorPosition)

      // when repository2 is selected, restore its state
      viewForRepo2 = new CommitView({workspace, repository: repository2, commandRegistry, stagedChangesExist: true, viewState: viewStateForRepo2})
      editor = viewForRepo2.refs.editor
      assert.equal(editor.getText(), repository2Message)
      assert.deepEqual(editor.getCursorBufferPosition().serialize(), repository2CursorPosition)
    })

    it('retains the amend status and restores the correct commit message when amend state is exited', async () => {
      const workdirPath1 = await cloneRepository('multiple-commits')
      const repository1 = await buildRepository(workdirPath1)
      const workdirPath2 = await cloneRepository('three-files')
      const repository2 = await buildRepository(workdirPath2)

      const repository1LastCommit = {message: 'first repository\'s previous commit\'s message'}
      const repository2LastCommit = {message: 'second repository\'s previous commit\'s message'}
      const viewStateForRepo1 = {}
      const viewStateForRepo2 = {}

      const view = new CommitView({workspace, repository: repository1, lastCommit: repository1LastCommit, commandRegistry, stagedChangesExist: true, viewState: viewStateForRepo1})
      const {editor, amend} = view.refs

      // create message for repository1
      const repository1Message = 'commit message for first repo\nsome details about the commit\nmore details'
      editor.setText(repository1Message)
      await etch.getScheduler().getNextUpdatePromise()

      // put repository1 in amend state, commit message changes to that of the last commit
      amend.click()
      await etch.getScheduler().getNextUpdatePromise()
      assert.isTrue(amend.checked)
      assert.equal(editor.getText(), repository1LastCommit.message)

      // when repository2 is selected, restore to initial state of unchecked amend box and empty commit message
      await view.update({repository: repository2, lastCommit: repository2LastCommit, viewState: viewStateForRepo2})
      assert.isFalse(amend.checked)
      assert.equal(editor.getText(), '')

      // create commit message for repository2
      const repository2Message = 'commit message for second repo'
      editor.setText(repository2Message)
      await etch.getScheduler().getNextUpdatePromise()
      assert.isFalse(amend.checked)
      assert.equal(editor.getText(), repository2Message)

      // put repository2 in amend state, commit message changes to that of the last commit
      amend.click()
      await etch.getScheduler().getNextUpdatePromise()
      assert.isTrue(amend.checked)
      assert.equal(editor.getText(), repository2LastCommit.message)

      // when repository1 is selected, restore its state
      await view.update({repository: repository1, viewState: viewStateForRepo1})
      assert.isTrue(amend.checked)
      assert.equal(editor.getText(), repository1LastCommit.message)

      // exit amend state and restore original message for repository1
      amend.click()
      assert.isFalse(amend.checked)
      assert.equal(editor.getText(), repository1Message)

      // when repository2 is selected, restore its state
      await view.update({repository: repository2, viewState: viewStateForRepo2})
      assert.isTrue(amend.checked)
      assert.equal(editor.getText(), repository2LastCommit.message)

      // exit amend state and restore original message for repository2
      amend.click()
      assert.isFalse(amend.checked)
      assert.equal(editor.getText(), repository2Message)
    })
  })
})
