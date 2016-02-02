/** @babel */

import FileList from '../lib/file-list'
import {createFileDiffsFromPath} from './helpers'

function createFileList(filePath) {
  let fileDiffs = createFileDiffsFromPath(filePath)
  return new FileList(fileDiffs)
}

describe("FileList", function() {
  it("emits a change event when a file is staged", function() {
    let fileList = createFileList('fixtures/two-file-diff.txt')
    let changeHandler = jasmine.createSpy()
    fileList.onDidChange(changeHandler)

    let fileDiff = fileList.getFiles()[0]
    fileDiff.stage()
    expect(changeHandler.callCount).toBe(1)
  })
})
