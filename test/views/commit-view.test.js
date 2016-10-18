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
    const view = new CommitView({workspace, commandRegistry, stagedChanges: [], maximumCharacterLimit: 72})
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

    await view.update({stagedChanges: [], maximumCharacterLimit: 50})
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
    const view = new CommitView({workspace, commandRegistry, stagedChangesExist: false})
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

  it('replaces the contents of the commit message when it is empty and it is supplied from the outside', async () => {
    const view = new CommitView({workspace, commandRegistry, stagedChanges: [], maximumCharacterLimit: 72, message: 'message 1'})
    const {editor} = view.refs
    assert.equal(editor.getText(), 'message 1')

    await view.update({message: 'message 2'})
    assert.equal(editor.getText(), 'message 1')

    editor.setText('')
    await view.update({message: 'message 3'})
    assert.equal(editor.getText(), 'message 3')
  })

  it('shows the "Abort Merge" button when props.isMerging is true', async () => {
    const view = new CommitView({workspace, commandRegistry, stagedChanges: [], isMerging: false})
    const {abortMergeButton} = view.refs
    assert.equal(abortMergeButton.style.display, 'none')

    await view.update({isMerging: true})
    assert.equal(abortMergeButton.style.display, '')

    await view.update({isMerging: false})
    assert.equal(abortMergeButton.style.display, 'none')
  })

  it('calls props.abortMerge() when the "Abort Merge" button is clicked and then clears the commit message', async () => {
    const abortMerge = sinon.spy(() => Promise.resolve())
    const view = new CommitView({workspace, commandRegistry, stagedChanges: [], isMerging: true, abortMerge})
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
    const view = new CommitView({workspace, commandRegistry, notificationManager, stagedChanges: [], isMerging: true, abortMerge})
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
    it('displays the appropriate commit message', async () => {
      const workdirPath = await cloneRepository('three-files')
      const repository = await buildRepository(workdirPath)
      const view = new CommitView({workspace, commandRegistry, stagedChangesExist: false, lastCommit: {message: 'previous commit\'s message'}})
      const {editor, amend} = view.refs

      editor.setText('some commit message')
      await view.update({repository, stagedChangesExist: true})

      assert.isFalse(amend.checked)
      assert.equal(editor.getText(), 'some commit message')

      // displays message for last commit
      amend.click()
      assert.isTrue(amend.checked)
      assert.equal(editor.getText(), 'previous commit\'s message')

      // restores original message
      amend.click()
      assert.isFalse(amend.checked)
      assert.equal(editor.getText(), 'some commit message')
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
})
