/** @babel */

import FileList from '../lib/file-list'
import FileDiff from '../lib/file-diff'
import GitService from '../lib/git-service'
import {createFileDiffsFromPath} from './helpers'
import {it, beforeEach} from './async-spec-helpers'

function createFileList (filePath, gitService) {
  let fileDiffs = createFileDiffsFromPath(filePath)
  return new FileList(fileDiffs, gitService)
}

describe('FileList', function () {
  let fileList
  let gitService

  beforeEach(() => {
    gitService = new GitService(atom.project.getPaths()[0])
  })

  it('emits a change event when a file is staged', function () {
    fileList = createFileList('fixtures/two-file-diff.txt', gitService)
    let changeHandler = jasmine.createSpy()
    fileList.onDidChange(changeHandler)

    let fileDiff = fileList.getFiles()[0]
    fileDiff.stage()
    expect(changeHandler.callCount).toBe(1)
    let args = changeHandler.mostRecentCall.args
    expect(args[0].fileList).toBe(fileList)
    expect(args[0].events).toHaveLength(1)
    expect(args[0].events[0].file).toBe(fileDiff)
  })

  it('emits a change event when a file is staged', function () {
    fileList = createFileList('fixtures/two-file-diff.txt', gitService)
    let changeHandler = jasmine.createSpy()
    fileList.onDidChange(changeHandler)

    fileList.getFiles()[0].getHunks()[0].stage()
    let args = changeHandler.mostRecentCall.args
    expect(args[0].fileList).toBe(fileList)
    expect(args[0].events).toHaveLength(1)
    expect(args[0].events[0].file).toBe(fileList.getFiles()[0])
  })

  it('opens a new diff item as pending when openFileDiff is called', function () {
    spyOn(atom.workspace, 'open')
    fileList.openFileDiff(fileList.getFiles()[0])

    let args = atom.workspace.open.mostRecentCall.args
    expect(args[0]).toContain('config.coffee')
    expect(args[1].pending).toBe(true)
  })

  it('opens a file for editing when openFile is called', function () {
    spyOn(atom.workspace, 'open')
    fileList.openFile(fileList.getFiles()[0])

    let args = atom.workspace.open.mostRecentCall.args
    expect(args[0]).toEqual('src/config.coffee')
    expect(args[1].pending).toBe(true)
  })

  describe('the file cache', function () {
    let fileDiffA, fileDiffB
    beforeEach(function () {
      fileDiffA = new FileDiff({
        oldPathName: 'src/a.js',
        newPathName: 'src/a.js'
      })
      fileDiffB = new FileDiff({
        oldPathName: 'src/b.js',
        newPathName: 'src/b.js'
      })
      fileList = new FileList([fileDiffA, fileDiffB], gitService)
    })

    it('creates and retreives fileDiffs', function () {
      expect(fileList.getFileFromPathName(fileDiffA.getNewPathName())).toBe(fileDiffA)
      expect(fileList.getFileFromPathName(fileDiffB.getNewPathName())).toBe(fileDiffB)

      let fileDiffC = fileList.getOrCreateFileFromPathName('src/c.js')
      expect(fileList.getFileFromPathName(fileDiffC.getNewPathName())).toBe(fileDiffC)
    })

    it('moves model to the new file key when a file is renamed', function () {
      fileDiffA.setNewPathName('src/a-new.js')
      fileList.setFiles([fileDiffA, fileDiffB])
      expect(fileList.getFileFromPathName('src/a-new.js')).toBe(fileDiffA)
      expect(fileList.getFileFromPathName('src/a.js')).toBeUndefined()
      expect(fileList.getFileFromPathName(fileDiffB.getNewPathName())).toBe(fileDiffB)
    })
  })
})
