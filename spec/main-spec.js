/** @babel */

import path from 'path'
import FileList from '../lib/file-list'
import FileDiff from '../lib/file-diff'
import DiffViewModel from '../lib/diff-view-model'
import {createFileDiffsFromPath} from './helpers'
import {it, ffit, fffit, beforeEach, afterEach} from './async-spec-helpers'

function createFileDiffs(filePath) {
  return createFileDiffsFromPath(filePath)
}

describe("Git Main Module", function() {
  let gitPackage, gitPackageModule, fileDiffs, fileList

  beforeEach(async function() {
    jasmine.useRealClock()

    fileDiffs = createFileDiffs('fixtures/two-file-diff.txt')

    gitPackage = atom.packages.loadPackage('git-prototype')
    gitPackageModule = gitPackage.mainModule

    fileList = gitPackageModule.getFileListInstance()
    spyOn(fileList, 'loadFromGitUtils').andCallFake(() => {
      fileList.setFiles(fileDiffs)
    })

    await atom.packages.activatePackage('git-prototype')
  })

  afterEach(function() {
    // TODO/FML: not sure how to properly deal with this, but without this the
    // package will not be loaded next time.
    localStorage.removeItem(gitPackage.getCanDeferMainModuleRequireStorageKey())
  })

  it("opens the diff for the open file when 'git:open-file-diff' is triggered", async function() {
    atom.project.setPaths([path.join(__dirname)])
    await atom.workspace.open('fixtures/two-file-diff.txt')
    await gitPackageModule.openDiffForActiveEditor()
    let paneItem = atom.workspace.getActivePaneItem()
    expect(paneItem instanceof DiffViewModel).toBe(true)
    expect(paneItem.pending).toBe(true)
    expect(paneItem.uri).toContain('two-file-diff.txt')
  })
})
