/** @babel */

import fs from 'fs'
import path from 'path'
import DiffViewModel from '../lib/diff-view-model'
import FileDiff from '../lib/file-diff'
import {createObjectsFromString} from '../lib/common'

function createFileDiffsFromString(str) {
  return createObjectsFromString(str, 'FILE', FileDiff)
}

function readFileSync(fileName) {
  return fs.readFileSync(path.join(__dirname, fileName), 'utf-8')
}

fdescribe("DiffViewModel", function() {
  describe("selecting diffs", function() {
    let diffStr
    beforeEach(function() {
      diffStr = readFileSync('fixtures/two-file-diff.txt')
    })
    it("initially selects the first hunk", function() {
      let fileDiffs = createFileDiffsFromString(diffStr)
      console.log(fileDiffs[0].toString());
    })
  })
})
