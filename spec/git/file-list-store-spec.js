/** @babel */

import {createGitStore} from './git-helpers'

describe('GitStore', function () {
  let gitStore

  beforeEach(async () => {
    gitStore = await createGitStore()
  })

  it('opens a new diff item as pending when openFileDiff is called', () => {
    spyOn(atom.workspace, 'open')
    gitStore.openFileDiff(gitStore.getFiles()[0])

    let args = atom.workspace.open.mostRecentCall.args
    expect(args[0]).toContain('README.md')
    expect(args[1].pending).toBe(true)
  })

  it('opens a file for editing when openFile is called', () => {
    spyOn(atom.workspace, 'open')
    gitStore.openFile(gitStore.getFiles()[0])

    let args = atom.workspace.open.mostRecentCall.args
    expect(args[0]).toEqual('README.md')
    expect(args[1].pending).toBe(true)
  })
})
