/** @babel */

import {createGitStore} from './helpers'
import {it, beforeEach} from './async-spec-helpers'

describe('GitStore', function () {
  let fileListStore

  beforeEach(async () => {
    fileListStore = await createGitStore()
  })

  it('opens a new diff item as pending when openFileDiff is called', () => {
    spyOn(atom.workspace, 'open')
    fileListStore.openFileDiff(fileListStore.getFiles()[0])

    let args = atom.workspace.open.mostRecentCall.args
    expect(args[0]).toContain('README.md')
    expect(args[1].pending).toBe(true)
  })

  it('opens a file for editing when openFile is called', () => {
    spyOn(atom.workspace, 'open')
    fileListStore.openFile(fileListStore.getFiles()[0])

    let args = atom.workspace.open.mostRecentCall.args
    expect(args[0]).toEqual('README.md')
    expect(args[1].pending).toBe(true)
  })
})
