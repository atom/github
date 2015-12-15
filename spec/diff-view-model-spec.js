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

function createDiffs(fileName) {
  let diffStr = readFileSync(fileName)
  let fileDiffs = createFileDiffsFromString(diffStr)
  return new DiffViewModel({fileDiffs})
}

function expectHunkToBeSelected(isSelected, viewModel, fileDiffIndex, diffHunkIndex) {
  let lines = viewModel.getFileDiffs()[fileDiffIndex].getHunks()[diffHunkIndex].getLines()
  for (var i = 0; i < lines.length; i++) {
    expect(viewModel.isLineSelected(fileDiffIndex, diffHunkIndex, i)).toBe(isSelected)
  }
}

fdescribe("DiffViewModel", function() {
  describe("selecting diffs", function() {
    let viewModel
    beforeEach(function() {
      viewModel = createDiffs('fixtures/two-file-diff.txt')
    })
    it("initially selects the first hunk", function() {
      expectHunkToBeSelected(true, viewModel, 0, 0)
      expectHunkToBeSelected(false, viewModel, 0, 1)
      expectHunkToBeSelected(false, viewModel, 0, 2)
      expectHunkToBeSelected(false, viewModel, 1, 0)
    })

    describe("::selectNext()", function() {
      it("selects the next hunk until the end is reached, then stops", function() {
        viewModel.selectNext()
        expectHunkToBeSelected(false, viewModel, 0, 0)
        expectHunkToBeSelected(true, viewModel, 0, 1)
        expectHunkToBeSelected(false, viewModel, 0, 2)
        expectHunkToBeSelected(false, viewModel, 1, 0)

        viewModel.selectNext()
        expectHunkToBeSelected(false, viewModel, 0, 0)
        expectHunkToBeSelected(false, viewModel, 0, 1)
        expectHunkToBeSelected(true, viewModel, 0, 2)
        expectHunkToBeSelected(false, viewModel, 1, 0)

        viewModel.selectNext()
        expectHunkToBeSelected(false, viewModel, 0, 0)
        expectHunkToBeSelected(false, viewModel, 0, 1)
        expectHunkToBeSelected(false, viewModel, 0, 2)
        expectHunkToBeSelected(true, viewModel, 1, 0)

        viewModel.selectNext()
        expectHunkToBeSelected(false, viewModel, 0, 0)
        expectHunkToBeSelected(false, viewModel, 0, 1)
        expectHunkToBeSelected(false, viewModel, 0, 2)
        expectHunkToBeSelected(true, viewModel, 1, 0)
      })
    })

    describe("::selectPrevious()", function() {
      it("selects the next hunk until the end is reached, then stops", function() {
        viewModel.selectNext()
        viewModel.selectNext()
        viewModel.selectNext()
        viewModel.selectNext()
        expectHunkToBeSelected(false, viewModel, 0, 0)
        expectHunkToBeSelected(false, viewModel, 0, 1)
        expectHunkToBeSelected(false, viewModel, 0, 2)
        expectHunkToBeSelected(true, viewModel, 1, 0)

        viewModel.selectPrevious()
        expectHunkToBeSelected(false, viewModel, 0, 0)
        expectHunkToBeSelected(false, viewModel, 0, 1)
        expectHunkToBeSelected(true, viewModel, 0, 2)
        expectHunkToBeSelected(false, viewModel, 1, 0)

        viewModel.selectPrevious()
        expectHunkToBeSelected(false, viewModel, 0, 0)
        expectHunkToBeSelected(true, viewModel, 0, 1)
        expectHunkToBeSelected(false, viewModel, 0, 2)
        expectHunkToBeSelected(false, viewModel, 1, 0)

        viewModel.selectPrevious()
        expectHunkToBeSelected(true, viewModel, 0, 0)
        expectHunkToBeSelected(false, viewModel, 0, 1)
        expectHunkToBeSelected(false, viewModel, 0, 2)
        expectHunkToBeSelected(false, viewModel, 1, 0)

        viewModel.selectPrevious()
        expectHunkToBeSelected(true, viewModel, 0, 0)
        expectHunkToBeSelected(false, viewModel, 0, 1)
        expectHunkToBeSelected(false, viewModel, 0, 2)
        expectHunkToBeSelected(false, viewModel, 1, 0)
      })
    })
  })
})
