/** @babel */

import {copyRepositoryDir, buildRepository} from '../helpers'
import path from 'path'
import fs from 'fs'
import etch from 'etch'
import sinon from 'sinon'

import CommitView from '../../lib/views/commit-view'
import FilePatch from '../../lib/models/file-patch'

describe('CommitView', () => {
  let atomEnv, workspace, commandRegistry

  beforeEach(() => {
    atomEnv = global.buildAtomEnvironment()
    workspace = atomEnv.workspace
    commandRegistry = atomEnv.commands
  })

  afterEach(() => {
    atomEnv.destroy()
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

  it('disables the commit button when no changes are staged or the commit message is empty', async () => {
    const view = new CommitView({workspace, commandRegistry, stagedChanges: []})
    const {editor, commitButton} = view.refs
    assert(commitButton.disabled)

    editor.setText('something')
    await etch.getScheduler().getNextUpdatePromise()
    assert(commitButton.disabled)

    await view.update({stagedChanges: [new FilePatch()]})
    assert(!commitButton.disabled)

    editor.setText('')
    await etch.getScheduler().getNextUpdatePromise()
    assert(commitButton.disabled)
  })

  it('calls props.commit(message) when the commit button is clicked or git:commit is dispatched', async () => {
    const workdirPath = await copyRepositoryDir('three-files')
    const repository = await buildRepository(workdirPath)
    const commit = sinon.spy()
    const view = new CommitView({workspace, commandRegistry, stagedChanges: [], commit})
    const {editor, commitButton} = view.refs

    // commit by clicking the commit button
    fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'change 1\n')
    const [patchToStage1] = await repository.refreshUnstagedChanges()
    await repository.applyPatchToIndex(patchToStage1)
    await view.update({repository, stagedChanges: [patchToStage1]})
    editor.setText('Commit 1')
    await etch.getScheduler().getNextUpdatePromise()
    commitButton.dispatchEvent(new MouseEvent('click'))
    assert.equal(commit.args[0][0], 'Commit 1')
    assert.equal(editor.getText(), '')

    // commit via the git:commit command
    commit.reset()
    fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'change 2\n')
    const [patchToStage2] = await repository.refreshUnstagedChanges()
    await repository.applyPatchToIndex(patchToStage2)
    await view.update({repository, stagedChanges: [patchToStage2]})
    editor.setText('Commit 2')
    await etch.getScheduler().getNextUpdatePromise()
    commandRegistry.dispatch(editor.element, 'git:commit')
    assert.equal(commit.args[0][0], 'Commit 2')
    assert.equal(editor.getText(), '')

    // disable git:commit when there are no staged changes...
    commit.reset()
    await view.update({repository, stagedChanges: []})
    editor.setText('Commit 4')
    await etch.getScheduler().getNextUpdatePromise()
    commandRegistry.dispatch(editor.element, 'git:commit')
    assert.equal(commit.callCount, 0)
    assert.equal(editor.getText(), 'Commit 4')

    // ...or the commit message is empty
    commit.reset()
    editor.setText('')
    await etch.getScheduler().getNextUpdatePromise()
    fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'change 3\n')
    const [patchToStage3] = await repository.refreshUnstagedChanges()
    await repository.applyPatchToIndex(patchToStage3)
    await view.update({repository, stagedChanges: [patchToStage3]})
    commandRegistry.dispatch(editor.element, 'git:commit')
    assert.equal(commit.callCount, 0)
  })

  it('replaces the contents of the editor when a message is supplied', async () => {
    const view = new CommitView({workspace, commandRegistry, stagedChanges: [], maximumCharacterLimit: 72, message: 'message 1'})
    const {editor} = view.refs
    assert.equal(editor.getText(), 'message 1')

    editor.setText('message 2')
    await view.update({message: null})
    assert.equal(editor.getText(), 'message 2')

    await view.update({message: 'message 3'})
    assert.equal(editor.getText(), 'message 3')
  })
})
