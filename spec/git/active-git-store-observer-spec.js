/* @flow */

import {copyRepository} from './git-helpers'
import ActiveGitStoreObserver from '../../lib/git/active-git-store-observer'
import type GitStore from '../../lib/git/git-store'
import path from 'path'

describe('ActiveGitStoreObserver', () => {
  fffit('does not change the active git store when the active pane item becomes null', () => {
    let callCount = 0
    const fakeDelegate = {
      setActiveGitStore: (gitStore: ?GitStore) => {
        callCount++
      }
    }

    const repoPath1 = copyRepository('dummy-atom') + '/'
    const repoPath2 = copyRepository('test-repo') + '/'
    atom.project.setPaths([repoPath1, repoPath2])

    const observer = new ActiveGitStoreObserver(atom.project, atom.workspace, fakeDelegate)
    await until(() => callCount === 1)

    const textEditor = await atom.workspace.open(path.join(repoPath1, 'README.md'))
    await until(() => callCount === 2)

    textEditor.destroy()
    await timeout(100)
    expect(callCount).toBe(2)

    observer.destroy()
  })

  it('sets the active git store to the first repository in the project when the last pane item gets closed', () => {

  })

  it('sets the active git store to null when the last repository is removed from the project', () => {

  })

  it('sets the active git store on the delegate when the active pane item changes', async () => {
    let activeGitStore = null
    const fakeDelegate = {
      setActiveGitStore: (gitStore: ?GitStore) => {
        activeGitStore = gitStore
      }
    }

    const repoPath1 = copyRepository('dummy-atom') + '/'
    const repoPath2 = copyRepository('test-repo') + '/'
    atom.project.setPaths([repoPath1, repoPath2])

    const observer = new ActiveGitStoreObserver(atom.project, atom.workspace, fakeDelegate)
    await until(() => activeGitStore === undefined)

    await atom.workspace.open(path.join(repoPath1, 'README.md'))
    await until(() => activeGitStore != null)
    // $FlowFixMe: activeGitStore != null
    expect(await activeGitStore.getWorkingDirectory()).toBe(repoPath1)

    activeGitStore = null
    await atom.workspace.open(path.join(repoPath2, 'README.md'))
    await until(() => activeGitStore != null)
    // $FlowFixMe: activeGitStore != null
    expect(await activeGitStore.getWorkingDirectory()).toBe(repoPath2)

    observer.destroy()
  })
})
