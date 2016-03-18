/** @babel */

import path from 'path'
import fs from 'fs-plus'
import DiffViewModel from '../lib/diff-view-model'
import GitPackage from '../lib/git-package'
import {copyRepository} from './helpers'
import {it, beforeEach, afterEach} from './async-spec-helpers'

function commit (fileListViewModel, msg) {
  const fileList = fileListViewModel.fileList
  const fileDiff = fileList.getFiles()[0]

  const changeHandler = jasmine.createSpy()
  const commitHandler = jasmine.createSpy()
  runs(() => {
    fileList.onDidUserChange(changeHandler)
    fileDiff.stage()
  })
  waitsFor('staging', () => changeHandler.callCount === 1)
  runs(() => {
    const commitViewModel = fileListViewModel.commitBoxViewModel
    commitViewModel.onDidCommit(commitHandler)
    commitViewModel.commit(msg)
  })
  waitsFor('committing', () => commitHandler.callCount === 1)
}

describe('GitPackage', function () {
  let gitPackage
  let repo

  beforeEach(async () => {
    jasmine.useRealClock()

    repo = copyRepository()
    atom.project.setPaths([repo])

    gitPackage = new GitPackage()

    await atom.packages.activatePackage('git')
  })

  afterEach(() => {
    gitPackage.deactivate()
  })

  xit('closes open diffs of files that were committed', async () => {
    fs.writeFileSync(path.join(repo, 'README.md'), 'hey diddle diddle')

    await gitPackage.update()
    await atom.workspace.open('README.md')
    await gitPackage.openDiffForActiveEditor()

    const paneItem = atom.workspace.getActivePaneItem()
    expect(paneItem instanceof DiffViewModel).toBe(true)

    commit(gitPackage.getFileListViewModel(), 'hey')
    waitsFor('the pane item to close', () => {
      const paneItem = atom.workspace.getActivePaneItem()
      return !(paneItem instanceof DiffViewModel)
    })
  })
})
