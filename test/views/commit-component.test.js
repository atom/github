/** @babel */

import {copyRepositoryDir, buildRepository} from '../helpers'
import path from 'path'
import fs from 'fs'
import etch from 'etch'

import CommitComponent from '../../lib/views/commit-component'

describe('CommitComponent', () => {
  let atomEnv, workspace

  beforeEach(() => {
    atomEnv = global.buildAtomEnvironment()
    workspace = atomEnv.workspace
  })

  afterEach(() => {
    atomEnv.destroy()
  })

  it('renders the commit box only when the repository data is loaded', async () => {
    const component = new CommitComponent({workspace})
    assert.isUndefined(component.refs.commitBox)

    const workdirPath = await copyRepositoryDir(1)
    const repository = await buildRepository(workdirPath)
    await component.update({repository})
    assert.isUndefined(component.refs.commitBox)

    await component.lastModelDataRefreshPromise
    assert.isDefined(component.refs.commitBox)
  })

  it('displays the remaining characters limit based on which line is being edited', async () => {
    const workdirPath = await copyRepositoryDir(1)
    const repository = await buildRepository(workdirPath)
    const component = new CommitComponent({repository, workspace, maximumCharacterLimit: 72})
    await component.lastModelDataRefreshPromise

    const {editor} = component.refs
    assert.equal(component.refs.remainingCharacters.textContent, '72')

    editor.insertText('abcde fghij')
    await etch.getScheduler().getNextUpdatePromise()
    assert.equal(component.refs.remainingCharacters.textContent, '61')
    assert(!component.refs.remainingCharacters.classList.contains('is-error'))
    assert(!component.refs.remainingCharacters.classList.contains('is-warning'))

    editor.insertText('\nklmno')
    await etch.getScheduler().getNextUpdatePromise()
    assert.equal(component.refs.remainingCharacters.textContent, '∞')
    assert(!component.refs.remainingCharacters.classList.contains('is-error'))
    assert(!component.refs.remainingCharacters.classList.contains('is-warning'))

    editor.insertText('\npqrst')
    await etch.getScheduler().getNextUpdatePromise()
    assert.equal(component.refs.remainingCharacters.textContent, '∞')
    assert(!component.refs.remainingCharacters.classList.contains('is-error'))
    assert(!component.refs.remainingCharacters.classList.contains('is-warning'))

    editor.setCursorBufferPosition([0, 3])
    await etch.getScheduler().getNextUpdatePromise()
    assert.equal(component.refs.remainingCharacters.textContent, '61')
    assert(!component.refs.remainingCharacters.classList.contains('is-error'))
    assert(!component.refs.remainingCharacters.classList.contains('is-warning'))

    await component.update({maximumCharacterLimit: 50})
    await etch.getScheduler().getNextUpdatePromise()
    assert.equal(component.refs.remainingCharacters.textContent, '39')
    assert(!component.refs.remainingCharacters.classList.contains('is-error'))
    assert(!component.refs.remainingCharacters.classList.contains('is-warning'))

    editor.insertText('abcde fghij klmno pqrst uvwxyz')
    await etch.getScheduler().getNextUpdatePromise()
    assert.equal(component.refs.remainingCharacters.textContent, '9')
    assert(!component.refs.remainingCharacters.classList.contains('is-error'))
    assert(component.refs.remainingCharacters.classList.contains('is-warning'))

    editor.insertText('ABCDE FGHIJ KLMNO')
    await etch.getScheduler().getNextUpdatePromise()
    assert.equal(component.refs.remainingCharacters.textContent, '-8')
    assert(component.refs.remainingCharacters.classList.contains('is-error'))
    assert(!component.refs.remainingCharacters.classList.contains('is-warning'))
  })

  it('disables the commit button when no changes are staged or the commit message is empty', async () => {
    const workdirPath = await copyRepositoryDir(1)
    const repository = await buildRepository(workdirPath)
    const component = new CommitComponent({workspace, repository})
    await component.lastModelDataRefreshPromise

    const {editor, commitButton} = component.refs
    assert(commitButton.disabled)

    editor.setText('something')
    await etch.getScheduler().getNextUpdatePromise()
    assert(commitButton.disabled)

    fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'a change\n')
    const [patchToStage] = await repository.getUnstagedChanges()
    await repository.applyPatchToIndex(patchToStage)
    await component.lastModelDataRefreshPromise
    assert(!commitButton.disabled)

    editor.setText('')
    await etch.getScheduler().getNextUpdatePromise()
    assert(commitButton.disabled)
  })

  it('creates a commit when the commit button is clicked', async () => {
    const workdirPath = await copyRepositoryDir(1)
    const repository = await buildRepository(workdirPath)
    const component = new CommitComponent({workspace, repository})
    await component.lastModelDataRefreshPromise

    const {editor, commitButton} = component.refs
    editor.setText('Commit 1')
    fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'a change\n')
    const [patchToStage] = await repository.getUnstagedChanges()
    await repository.applyPatchToIndex(patchToStage)
    await component.lastModelDataRefreshPromise

    commitButton.dispatchEvent(new MouseEvent('click'))
    await component.lastCommitPromise
    assert.equal(await repository.getLastCommitMessage(), 'Commit 1')
    assert.equal(editor.getText(), '')
  })
})
