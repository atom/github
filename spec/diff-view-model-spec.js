/** @babel */

import fs from 'fs'
import path from 'path'
import DiffViewModel from '../lib/diff-view-model'
import FileDiff from '../lib/file-diff'
import {createFileDiffsFromPath} from './helpers'

function createDiffs(filePath) {
  let fileDiffs = createFileDiffsFromPath(filePath)
  return new DiffViewModel({fileDiffs})
}

function expectHunkToBeSelected(isSelected, viewModel, fileDiffIndex, diffHunkIndex) {
  let lines = viewModel.getFileDiffs()[fileDiffIndex].getHunks()[diffHunkIndex].getLines()
  for (var i = 0; i < lines.length; i++) {
    expect(viewModel.isLineSelected(fileDiffIndex, diffHunkIndex, i)).toBe(isSelected)
  }
}

function expectLineToBeSelected(isSelected, viewModel, fileDiffIndex, diffHunkIndex, hunkLineIndex) {
  expect(viewModel.isLineSelected(fileDiffIndex, diffHunkIndex, hunkLineIndex)).toBe(isSelected)
}

describe("DiffViewModel", function() {
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

    describe("selecting hunks", function() {
      describe("::moveSelectionDown()", function() {
        it("selects the next hunk until the end is reached, then stops", function() {
          viewModel.moveSelectionDown()
          expectHunkToBeSelected(false, viewModel, 0, 0)
          expectHunkToBeSelected(true, viewModel, 0, 1)
          expectHunkToBeSelected(false, viewModel, 0, 2)
          expectHunkToBeSelected(false, viewModel, 1, 0)

          viewModel.moveSelectionDown()
          expectHunkToBeSelected(false, viewModel, 0, 0)
          expectHunkToBeSelected(false, viewModel, 0, 1)
          expectHunkToBeSelected(true, viewModel, 0, 2)
          expectHunkToBeSelected(false, viewModel, 1, 0)

          viewModel.moveSelectionDown()
          expectHunkToBeSelected(false, viewModel, 0, 0)
          expectHunkToBeSelected(false, viewModel, 0, 1)
          expectHunkToBeSelected(false, viewModel, 0, 2)
          expectHunkToBeSelected(true, viewModel, 1, 0)

          viewModel.moveSelectionDown()
          expectHunkToBeSelected(false, viewModel, 0, 0)
          expectHunkToBeSelected(false, viewModel, 0, 1)
          expectHunkToBeSelected(false, viewModel, 0, 2)
          expectHunkToBeSelected(true, viewModel, 1, 0)
        })
      })

      describe("::moveSelectionUp()", function() {
        it("selects the previous hunk until the end is reached, then stops", function() {
          viewModel.moveSelectionDown()
          viewModel.moveSelectionDown()
          viewModel.moveSelectionDown()
          viewModel.moveSelectionDown()
          expectHunkToBeSelected(false, viewModel, 0, 0)
          expectHunkToBeSelected(false, viewModel, 0, 1)
          expectHunkToBeSelected(false, viewModel, 0, 2)
          expectHunkToBeSelected(true, viewModel, 1, 0)

          viewModel.moveSelectionUp()
          expectHunkToBeSelected(false, viewModel, 0, 0)
          expectHunkToBeSelected(false, viewModel, 0, 1)
          expectHunkToBeSelected(true, viewModel, 0, 2)
          expectHunkToBeSelected(false, viewModel, 1, 0)

          viewModel.moveSelectionUp()
          expectHunkToBeSelected(false, viewModel, 0, 0)
          expectHunkToBeSelected(true, viewModel, 0, 1)
          expectHunkToBeSelected(false, viewModel, 0, 2)
          expectHunkToBeSelected(false, viewModel, 1, 0)

          viewModel.moveSelectionUp()
          expectHunkToBeSelected(true, viewModel, 0, 0)
          expectHunkToBeSelected(false, viewModel, 0, 1)
          expectHunkToBeSelected(false, viewModel, 0, 2)
          expectHunkToBeSelected(false, viewModel, 1, 0)

          viewModel.moveSelectionUp()
          expectHunkToBeSelected(true, viewModel, 0, 0)
          expectHunkToBeSelected(false, viewModel, 0, 1)
          expectHunkToBeSelected(false, viewModel, 0, 2)
          expectHunkToBeSelected(false, viewModel, 1, 0)
        })
      })

      describe("::expandSelectionUp() and ::expandSelectionDown()", function() {
        it("selects the next hunk until the end is reached, then stops", function() {
          viewModel.moveSelectionDown()
          expectHunkToBeSelected(false, viewModel, 0, 0)
          expectHunkToBeSelected(true, viewModel, 0, 1)
          expectHunkToBeSelected(false, viewModel, 0, 2)
          expectHunkToBeSelected(false, viewModel, 1, 0)

          viewModel.expandSelectionDown()
          expectHunkToBeSelected(false, viewModel, 0, 0)
          expectHunkToBeSelected(true, viewModel, 0, 1)
          expectHunkToBeSelected(true, viewModel, 0, 2)
          expectHunkToBeSelected(false, viewModel, 1, 0)

          viewModel.expandSelectionDown()
          expectHunkToBeSelected(false, viewModel, 0, 0)
          expectHunkToBeSelected(true, viewModel, 0, 1)
          expectHunkToBeSelected(true, viewModel, 0, 2)
          expectHunkToBeSelected(true, viewModel, 1, 0)

          viewModel.expandSelectionDown()
          expectHunkToBeSelected(false, viewModel, 0, 0)
          expectHunkToBeSelected(true, viewModel, 0, 1)
          expectHunkToBeSelected(true, viewModel, 0, 2)
          expectHunkToBeSelected(true, viewModel, 1, 0)

          viewModel.expandSelectionUp()
          expectHunkToBeSelected(false, viewModel, 0, 0)
          expectHunkToBeSelected(true, viewModel, 0, 1)
          expectHunkToBeSelected(true, viewModel, 0, 2)
          expectHunkToBeSelected(false, viewModel, 1, 0)

          viewModel.expandSelectionUp()
          expectHunkToBeSelected(false, viewModel, 0, 0)
          expectHunkToBeSelected(true, viewModel, 0, 1)
          expectHunkToBeSelected(false, viewModel, 0, 2)
          expectHunkToBeSelected(false, viewModel, 1, 0)

          viewModel.expandSelectionUp()
          expectHunkToBeSelected(true, viewModel, 0, 0)
          expectHunkToBeSelected(true, viewModel, 0, 1)
          expectHunkToBeSelected(false, viewModel, 0, 2)
          expectHunkToBeSelected(false, viewModel, 1, 0)

          viewModel.expandSelectionUp()
          expectHunkToBeSelected(true, viewModel, 0, 0)
          expectHunkToBeSelected(true, viewModel, 0, 1)
          expectHunkToBeSelected(false, viewModel, 0, 2)
          expectHunkToBeSelected(false, viewModel, 1, 0)

          viewModel.moveSelectionDown()
          expectHunkToBeSelected(false, viewModel, 0, 0)
          expectHunkToBeSelected(true, viewModel, 0, 1)
          expectHunkToBeSelected(false, viewModel, 0, 2)
          expectHunkToBeSelected(false, viewModel, 1, 0)
        })
      })
    })

    describe("switching between hunk and line selection", function() {
      it("selects the first changed line in a hunk when one hunk is selected", function() {
        expectHunkToBeSelected(true, viewModel, 0, 0)

        viewModel.setSelectionMode('line')
        expectLineToBeSelected(false, viewModel, 0, 0, 0)
        expectLineToBeSelected(false, viewModel, 0, 0, 1)
        expectLineToBeSelected(false, viewModel, 0, 0, 2)
        expectLineToBeSelected(true, viewModel, 0, 0, 3)
        expectLineToBeSelected(false, viewModel, 0, 0, 4)
      })
    })

    describe("selecting lines", function() {
      beforeEach(function() {
        viewModel.setSelectionMode('line')
      })

      describe("::moveSelectionDown()", function() {
        it("selects next changed line in a hunk", function() {
          expectLineToBeSelected(false, viewModel, 0, 0, 2)
          expectLineToBeSelected(true, viewModel, 0, 0, 3)
          expectLineToBeSelected(false, viewModel, 0, 0, 4)

          viewModel.moveSelectionDown()
          expectLineToBeSelected(false, viewModel, 0, 0, 2)
          expectLineToBeSelected(false, viewModel, 0, 0, 3)
          expectLineToBeSelected(true, viewModel, 0, 0, 4)
          expectLineToBeSelected(false, viewModel, 0, 0, 5)
          expectLineToBeSelected(false, viewModel, 0, 0, 6)

          viewModel.moveSelectionDown()
          expectLineToBeSelected(false, viewModel, 0, 0, 2)
          expectLineToBeSelected(false, viewModel, 0, 0, 3)
          expectLineToBeSelected(false, viewModel, 0, 0, 4)
          expectLineToBeSelected(true, viewModel, 0, 0, 5)
          expectLineToBeSelected(false, viewModel, 0, 0, 6)

          viewModel.moveSelectionDown()
          expectHunkToBeSelected(false, viewModel, 0, 0)
          expectLineToBeSelected(false, viewModel, 0, 1, 0)
          expectLineToBeSelected(false, viewModel, 0, 1, 2)
          expectLineToBeSelected(true, viewModel, 0, 1, 3)
          expectLineToBeSelected(false, viewModel, 0, 1, 4)
          expectLineToBeSelected(false, viewModel, 0, 1, 5)

          viewModel.moveSelectionDown()
          expectHunkToBeSelected(false, viewModel, 0, 0)
          expectLineToBeSelected(false, viewModel, 0, 1, 0)
          expectLineToBeSelected(false, viewModel, 0, 1, 2)
          expectLineToBeSelected(false, viewModel, 0, 1, 3)
          expectLineToBeSelected(true, viewModel, 0, 1, 4)
          expectLineToBeSelected(false, viewModel, 0, 1, 5)
        })
      })

      describe("::moveSelectionUp()", function() {
        it("selects previous changed line in a hunk", function() {
          expectLineToBeSelected(false, viewModel, 0, 0, 2)
          expectLineToBeSelected(true, viewModel, 0, 0, 3)
          expectLineToBeSelected(false, viewModel, 0, 0, 4)

          viewModel.moveSelectionDown()
          viewModel.moveSelectionDown()
          viewModel.moveSelectionDown()
          viewModel.moveSelectionDown()
          viewModel.moveSelectionDown()
          expectHunkToBeSelected(false, viewModel, 0, 0)
          expectLineToBeSelected(false, viewModel, 0, 1, 0)
          expectLineToBeSelected(false, viewModel, 0, 1, 2)
          expectLineToBeSelected(false, viewModel, 0, 1, 3)
          expectLineToBeSelected(false, viewModel, 0, 1, 4)
          expectLineToBeSelected(true, viewModel, 0, 1, 5)
          expectLineToBeSelected(false, viewModel, 0, 1, 6)

          viewModel.moveSelectionUp()
          expectHunkToBeSelected(false, viewModel, 0, 0)
          expectLineToBeSelected(false, viewModel, 0, 1, 0)
          expectLineToBeSelected(false, viewModel, 0, 1, 2)
          expectLineToBeSelected(false, viewModel, 0, 1, 3)
          expectLineToBeSelected(true, viewModel, 0, 1, 4)
          expectLineToBeSelected(false, viewModel, 0, 1, 5)
          expectLineToBeSelected(false, viewModel, 0, 1, 6)

          viewModel.moveSelectionUp()
          expectHunkToBeSelected(false, viewModel, 0, 0)
          expectLineToBeSelected(false, viewModel, 0, 1, 0)
          expectLineToBeSelected(false, viewModel, 0, 1, 2)
          expectLineToBeSelected(true, viewModel, 0, 1, 3)
          expectLineToBeSelected(false, viewModel, 0, 1, 4)
          expectLineToBeSelected(false, viewModel, 0, 1, 5)
          expectLineToBeSelected(false, viewModel, 0, 1, 6)

          viewModel.moveSelectionUp()
          expectLineToBeSelected(false, viewModel, 0, 0, 0)
          expectLineToBeSelected(false, viewModel, 0, 0, 2)
          expectLineToBeSelected(false, viewModel, 0, 0, 3)
          expectLineToBeSelected(false, viewModel, 0, 0, 4)
          expectLineToBeSelected(true, viewModel, 0, 0, 5)
          expectLineToBeSelected(false, viewModel, 0, 0, 6)
          expectHunkToBeSelected(false, viewModel, 0, 1)
        })
      })

      describe("::expandSelectionDown()", function() {
        it("selects previous changed line in a hunk", function() {
          expectLineToBeSelected(true, viewModel, 0, 0, 3)
          expectLineToBeSelected(false, viewModel, 0, 0, 4)

          viewModel.expandSelectionDown()
          viewModel.expandSelectionDown()
          viewModel.expandSelectionDown()
          viewModel.expandSelectionDown()
          viewModel.expandSelectionDown()
          expectLineToBeSelected(true, viewModel, 0, 0, 3)
          expectLineToBeSelected(true, viewModel, 0, 0, 4)
          expectLineToBeSelected(true, viewModel, 0, 0, 5)
          expectLineToBeSelected(false, viewModel, 0, 0, 6)

          expectLineToBeSelected(false, viewModel, 0, 1, 0)
          expectLineToBeSelected(false, viewModel, 0, 1, 1)
          expectLineToBeSelected(false, viewModel, 0, 1, 2)
          expectLineToBeSelected(true, viewModel, 0, 1, 3)
          expectLineToBeSelected(true, viewModel, 0, 1, 4)
          expectLineToBeSelected(true, viewModel, 0, 1, 5)
          expectLineToBeSelected(false, viewModel, 0, 1, 6)
        })
      })
    })
  })

  describe("staging diffs", function() {
    let viewModel
    beforeEach(function() {
      viewModel = createDiffs('fixtures/two-file-diff.txt')
    })
    it("stages and unsages the selected hunk", function() {
      expectHunkToBeSelected(true, viewModel, 0, 0)
      expect(viewModel.getFileDiffs()[0].getStageStatus()).toBe('unstaged')

      viewModel.toggleSelectedLinesStageStatus()
      expect(viewModel.getFileDiffs()[0].getStageStatus()).toBe('partial')
      expect(viewModel.getFileDiffs()[0].getHunks()[0].getStageStatus()).toBe('staged')

      viewModel.toggleSelectedLinesStageStatus()
      expect(viewModel.getFileDiffs()[0].getStageStatus()).toBe('unstaged')
      expect(viewModel.getFileDiffs()[0].getHunks()[0].getStageStatus()).toBe('unstaged')
    })
    it("stages and unsages the selected line", function() {
      viewModel.setSelectionMode('line')
      expect(viewModel.getFileDiffs()[0].getHunks()[0].getLines()[3].isStaged()).toBe(false)

      viewModel.toggleSelectedLinesStageStatus()
      expect(viewModel.getFileDiffs()[0].getStageStatus()).toBe('partial')
      expect(viewModel.getFileDiffs()[0].getHunks()[0].getStageStatus()).toBe('partial')
      expect(viewModel.getFileDiffs()[0].getHunks()[0].getLines()[3].isStaged()).toBe(true)

      viewModel.toggleSelectedLinesStageStatus()
      expect(viewModel.getFileDiffs()[0].getStageStatus()).toBe('unstaged')
      expect(viewModel.getFileDiffs()[0].getHunks()[0].getStageStatus()).toBe('unstaged')
      expect(viewModel.getFileDiffs()[0].getHunks()[0].getLines()[3].isStaged()).toBe(false)
    })
  })
})
