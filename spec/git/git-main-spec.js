/** @babel */

import DiffViewModel from '../../lib/git/diff/diff-view-model'
import {copyRepository} from './git-helpers'

describe('Git Main Module', function () {
  let githubPackage, githubPackageModule

  beforeEach(async function () {
    jasmine.useRealClock()

    const repoPath = copyRepository('dummy-atom')
    atom.project.setPaths([repoPath])

    githubPackage = atom.packages.loadPackage('github')

    await atom.packages.activatePackage('github')
    githubPackageModule = githubPackage.mainModule.git
  })

  afterEach(function () {
    // TODO/FML: not sure how to properly deal with this, but without this the
    // package will not be loaded next time.
    window.localStorage.removeItem(githubPackage.getCanDeferMainModuleRequireStorageKey())
    atom.packages.deactivatePackage('github')
  })

  it('opens the diff for the open file when "git:open-file-diff" is triggered', async function () {
    await atom.workspace.open('src/config.coffee')
    await githubPackageModule.openDiffForActiveEditor()
    let paneItem = atom.workspace.getActivePaneItem()
    expect(paneItem instanceof DiffViewModel).toBe(true)
    expect(paneItem.pending).toBe(true)
    expect(paneItem.uri).toContain('config.coffee')
  })
})
