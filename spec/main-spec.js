/** @babel */

import DiffViewModel from '../lib/diff-view-model'
import {copyRepository} from './helpers'
import {it, beforeEach, afterEach} from './async-spec-helpers'

describe('Git Main Module', function () {
  let gitPackage, gitPackageModule

  beforeEach(async function () {
    jasmine.useRealClock()

    const repoPath = copyRepository('dummy-atom')
    atom.project.setPaths([repoPath])

    gitPackage = atom.packages.loadPackage('git')
    gitPackageModule = gitPackage.mainModule

    await atom.packages.activatePackage('git')
  })

  afterEach(function () {
    // TODO/FML: not sure how to properly deal with this, but without this the
    // package will not be loaded next time.
    window.localStorage.removeItem(gitPackage.getCanDeferMainModuleRequireStorageKey())
  })

  it('opens the diff for the open file when "git:open-file-diff" is triggered', async function () {
    await atom.workspace.open('src/config.coffee')
    await gitPackageModule.openDiffForActiveEditor()
    let paneItem = atom.workspace.getActivePaneItem()
    expect(paneItem instanceof DiffViewModel).toBe(true)
    expect(paneItem.pending).toBe(true)
    expect(paneItem.uri).toContain('config.coffee')
  })
})
