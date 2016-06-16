/** @babel */

import path from 'path'
import fs from 'fs-plus'
import DiffViewModel from '../../lib/git/diff/diff-view-model'
import GitPackage from '../../lib/git/git-package'
import {copyRepository} from './git-helpers'

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

  beforeEach(() => {
    gitPackage = new GitPackage()
    gitPackage.activate()
  })

  afterEach(() => {
    gitPackage.deactivate()
  })

  it('updates the view model of the FileListComponent panel item when the active pane item changes to a different project directory', async () => {
    const repoPath1 = copyRepository('test-repo')
    const repoPath2 = copyRepository('dummy-atom')
    atom.project.setPaths([repoPath1, repoPath2])

    const item1 = await atom.workspace.open(path.join(repoPath1, 'README.md'))
    await gitPackage.didChangeActivePaneItem(item1)
    await gitPackage.openChangesPanel()
    expect(await gitPackage.fileListComponent.getViewModel().getGitStore().getWorkingDirectory()).toBe(repoPath1 + '/')

    const item2 = await atom.workspace.open(path.join(repoPath2, 'src', 'config.coffee'))
    await gitPackage.didChangeActivePaneItem(item2)
    expect(await gitPackage.fileListComponent.getViewModel().getGitStore().getWorkingDirectory()).toBe(repoPath2 + '/')
  })

  it('updates the view model of the GitStatusBarComponent when the active pane item changes to a different project directory', async () => {
    const repoPath1 = copyRepository('test-repo')
    const repoPath2 = copyRepository('dummy-atom')
    atom.project.setPaths([repoPath1, repoPath2])

    const item1 = await atom.workspace.open(path.join(repoPath1, 'README.md'))
    await gitPackage.didChangeActivePaneItem(item1)
    await gitPackage.openChangesPanel()
    expect(await gitPackage.statusBarComponent.getViewModel().getGitStore().getWorkingDirectory()).toBe(repoPath1 + '/')

    const item2 = await atom.workspace.open(path.join(repoPath2, 'src', 'config.coffee'))
    await gitPackage.didChangeActivePaneItem(item2)
    expect(await gitPackage.statusBarComponent.getViewModel().getGitStore().getWorkingDirectory()).toBe(repoPath2 + '/')
  })

  xit('closes open diffs of files that were committed', async () => {
    jasmine.useRealClock()

    repo = copyRepository()
    atom.project.setPaths([repo])

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
