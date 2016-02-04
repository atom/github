/** @babel */

import FileList from '../lib/file-list'
import FileDiff from '../lib/file-diff'
import {createFileDiffsFromPath} from './helpers'

function createFileList(filePath) {
  let fileDiffs = createFileDiffsFromPath(filePath)
  return new FileList(fileDiffs)
}

describe("FileList", function() {
  let fileList
  it("emits a change event when a file is staged", function() {
    fileList = createFileList('fixtures/two-file-diff.txt')
    let changeHandler = jasmine.createSpy()
    fileList.onDidChange(changeHandler)

    let fileDiff = fileList.getFiles()[0]
    fileDiff.stage()
    expect(changeHandler.callCount).toBe(1)
  })

  describe("the file cache", function() {
    let fileDiffA, fileDiffB
    beforeEach(function() {
      fileDiffA = new FileDiff({
        oldPathName: 'src/a.js',
        newPathName: 'src/a.js'
      })
      fileDiffB = new FileDiff({
        oldPathName: 'src/b.js',
        newPathName: 'src/b.js'
      })
      fileList = new FileList([fileDiffA, fileDiffB])
    })

    it("", function() {
      expect(fileList.getFileFromPathName(fileDiffA.getNewPathName())).toBe(fileDiffA)
      expect(fileList.getFileFromPathName(fileDiffB.getNewPathName())).toBe(fileDiffB)

      let fileDiffC = fileList.getOrCreateFileFromPathName('src/c.js')
      expect(fileList.getFileFromPathName(fileDiffC.getNewPathName())).toBe(fileDiffC)
    })

    it("moves model to the new file key when a file is renamed", function() {
      fileDiffA.setNewPathName('src/a-new.js')
      fileList.setFiles([fileDiffA, fileDiffB])
      expect(fileList.getFileFromPathName('src/a-new.js')).toBe(fileDiffA)
      expect(fileList.getFileFromPathName('src/a.js')).toBeUndefined()
      expect(fileList.getFileFromPathName(fileDiffB.getNewPathName())).toBe(fileDiffB)
    })
  })
})
