/** @babel */

import fs from 'fs'
import path from 'path'
import DiffViewModel from '../lib/diff-view-model'
import DiffSelection from '../lib/diff-selection'
import FileDiff from '../lib/file-diff'
import FileList from '../lib/file-list'
import {createFileDiffsFromPath} from './helpers'

function createDiffs(filePath) {
  let fileDiffs = createFileDiffsFromPath(filePath)
  return new DiffViewModel({fileList: new FileList(fileDiffs)})
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
  let viewModel
  describe("selecting diffs", function() {
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
          expectHunkToBeSelected(false, viewModel, 0, 1)
          expectHunkToBeSelected(true, viewModel, 0, 2)
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

        it("moves to the bottom of a multi-select", function() {
          viewModel.moveSelectionDown()
          viewModel.expandSelectionUp()
          expectLineToBeSelected(true, viewModel, 0, 0, 3)
          expectLineToBeSelected(true, viewModel, 0, 0, 4)
          expectLineToBeSelected(false, viewModel, 0, 0, 5)

          viewModel.moveSelectionDown()
          expectLineToBeSelected(false, viewModel, 0, 0, 3)
          expectLineToBeSelected(false, viewModel, 0, 0, 4)
          expectLineToBeSelected(true, viewModel, 0, 0, 5)
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

        it("moves to the top of a multi-select", function() {
          viewModel.moveSelectionDown()
          viewModel.expandSelectionDown()
          expectLineToBeSelected(false, viewModel, 0, 0, 3)
          expectLineToBeSelected(true, viewModel, 0, 0, 4)
          expectLineToBeSelected(true, viewModel, 0, 0, 5)

          viewModel.moveSelectionUp()
          expectLineToBeSelected(true, viewModel, 0, 0, 3)
          expectLineToBeSelected(false, viewModel, 0, 0, 4)
          expectLineToBeSelected(false, viewModel, 0, 0, 5)
        })
      })

      describe("::expandSelectionDown()", function() {
        it("selects previous changed line in a hunk", function() {
          expectLineToBeSelected(true, viewModel, 0, 0, 3)
          expectLineToBeSelected(false, viewModel, 0, 0, 4)

          viewModel.expandSelectionDown()
          expectLineToBeSelected(true, viewModel, 0, 0, 3)
          expectLineToBeSelected(true, viewModel, 0, 0, 4)
          expectLineToBeSelected(false, viewModel, 0, 0, 5)

          viewModel.expandSelectionDown()
          expectLineToBeSelected(true, viewModel, 0, 0, 3)
          expectLineToBeSelected(true, viewModel, 0, 0, 4)
          expectLineToBeSelected(true, viewModel, 0, 0, 5)

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

      describe("::expandSelectionUp()", function() {
        it("selects previous changed line in a hunk", function() {
          viewModel.moveSelectionDown()
          viewModel.moveSelectionDown()
          viewModel.moveSelectionDown()
          viewModel.moveSelectionDown()
          expectLineToBeSelected(false, viewModel, 0, 1, 3)
          expectLineToBeSelected(true, viewModel, 0, 1, 4)
          expectLineToBeSelected(false, viewModel, 0, 1, 5)

          viewModel.expandSelectionUp()
          expectLineToBeSelected(true, viewModel, 0, 1, 3)
          expectLineToBeSelected(true, viewModel, 0, 1, 4)
          expectLineToBeSelected(false, viewModel, 0, 1, 5)

          viewModel.expandSelectionUp()
          expectLineToBeSelected(false, viewModel, 0, 0, 3)
          expectLineToBeSelected(false, viewModel, 0, 0, 4)
          expectLineToBeSelected(true, viewModel, 0, 0, 5)
          expectLineToBeSelected(true, viewModel, 0, 1, 3)
          expectLineToBeSelected(true, viewModel, 0, 1, 4)
          expectLineToBeSelected(false, viewModel, 0, 1, 5)

          viewModel.expandSelectionUp()
          expectLineToBeSelected(false, viewModel, 0, 0, 3)
          expectLineToBeSelected(true, viewModel, 0, 0, 4)
          expectLineToBeSelected(true, viewModel, 0, 0, 5)
          expectLineToBeSelected(true, viewModel, 0, 1, 3)
          expectLineToBeSelected(true, viewModel, 0, 1, 4)
          expectLineToBeSelected(false, viewModel, 0, 1, 5)

          viewModel.expandSelectionUp()
          viewModel.expandSelectionUp()
          viewModel.expandSelectionUp()
          expectLineToBeSelected(false, viewModel, 0, 0, 2)
          expectLineToBeSelected(true, viewModel, 0, 0, 3)
          expectLineToBeSelected(true, viewModel, 0, 0, 4)
          expectLineToBeSelected(true, viewModel, 0, 0, 5)
          expectLineToBeSelected(true, viewModel, 0, 1, 3)
          expectLineToBeSelected(true, viewModel, 0, 1, 4)
          expectLineToBeSelected(false, viewModel, 0, 1, 5)
        })
      })
    })

    describe("::setSelection()", function() {
      it("updates the model when the selection is set", function() {
        let selection = new DiffSelection(viewModel, {
          mode: 'line',
          headPosition: [0, 1, 2],
          tailPosition: [0, 1, 4]
        })
        viewModel.setSelection(selection)

        expect(viewModel.getSelectionMode()).toBe('hunk')
        expectLineToBeSelected(false, viewModel, 0, 0, 3)
        expectLineToBeSelected(false, viewModel, 0, 0, 4)
        expectLineToBeSelected(false, viewModel, 0, 1, 2)
        expectLineToBeSelected(true, viewModel, 0, 1, 3)
        expectLineToBeSelected(true, viewModel, 0, 1, 4)
        expectLineToBeSelected(false, viewModel, 0, 1, 5)
      })
    })

    describe("::addSelection()", function() {
      it("updates the model when the selection is added", function() {
        let selection = new DiffSelection(viewModel, {
          mode: 'line',
          headPosition: [0, 1, 2],
          tailPosition: [0, 1, 4]
        })
        viewModel.setSelection(selection)

        selection = new DiffSelection(viewModel, {
          mode: 'line',
          headPosition: [0, 0, 2],
          tailPosition: [0, 0, 4]
        })
        viewModel.addSelection(selection)

        expect(viewModel.getSelectionMode()).toBe('hunk')
        expectLineToBeSelected(false, viewModel, 0, 0, 2)
        expectLineToBeSelected(true, viewModel, 0, 0, 3)
        expectLineToBeSelected(true, viewModel, 0, 0, 4)
        expectLineToBeSelected(false, viewModel, 0, 0, 5)
        expectLineToBeSelected(false, viewModel, 0, 1, 2)
        expectLineToBeSelected(true, viewModel, 0, 1, 3)
        expectLineToBeSelected(true, viewModel, 0, 1, 4)
        expectLineToBeSelected(false, viewModel, 0, 1, 5)
      })
    })

    describe("modifying the selection after adding custom selections", function() {
      let selection1, selection2
      beforeEach(function() {
        selection1 = new DiffSelection(viewModel, {
          mode: 'line',
          headPosition: [0, 1, 5],
          tailPosition: [0, 1, 4]
        })
        selection2 = new DiffSelection(viewModel, {
          mode: 'line',
          headPosition: [0, 2, 4],
          tailPosition: [0, 2, 5]
        })
      })

      it("stays in hunk mode when ::moveSelectionUp() is called in hunk mode", function() {
        viewModel.setSelectionMode('hunk')
        viewModel.setSelection(selection1)

        viewModel.moveSelectionUp()
        expectHunkToBeSelected(true, viewModel, 0, 0)
        expectHunkToBeSelected(false, viewModel, 0, 1)
        expectHunkToBeSelected(false, viewModel, 0, 2)
      })

      it("selects above the top selection when ::moveSelectionUp() is called in hunk mode", function() {
        viewModel.setSelectionMode('hunk')
        viewModel.setSelection(selection1)
        viewModel.addSelection(selection2)

        viewModel.moveSelectionUp()
        expectHunkToBeSelected(true, viewModel, 0, 0)
        expectHunkToBeSelected(false, viewModel, 0, 1)
        expectHunkToBeSelected(false, viewModel, 0, 2)
      })

      it("selects below the bottom selection when ::moveSelectionDown() is called in hunk mode", function() {
        viewModel.setSelectionMode('hunk')
        viewModel.setSelection(selection1)
        viewModel.addSelection(selection2)

        viewModel.moveSelectionDown()
        expectHunkToBeSelected(false, viewModel, 0, 0)
        expectHunkToBeSelected(false, viewModel, 0, 1)
        expectHunkToBeSelected(false, viewModel, 0, 2)
        expectHunkToBeSelected(true, viewModel, 1, 0)
      })

      it("keeps the last selection when ::toggleSelectionMode() is called", function() {
        viewModel.setSelectionMode('hunk')
        viewModel.setSelection(selection1)
        viewModel.addSelection(selection2)

        viewModel.toggleSelectionMode()
        expect(viewModel.getSelectionMode()).toBe('line')
        expectLineToBeSelected(false, viewModel, 0, 1, 4)
        expectLineToBeSelected(true, viewModel, 0, 2, 4)
      })
    })
  })

  describe("staging diffs", function() {
    beforeEach(function() {
      viewModel = createDiffs('fixtures/two-file-diff.txt')
    })

    it("stages and unstages the selected hunk", function() {
      expectHunkToBeSelected(true, viewModel, 0, 0)
      expect(viewModel.getFileDiffs()[0].getStageStatus()).toBe('unstaged')

      viewModel.toggleSelectedLinesStageStatus()
      expect(viewModel.getFileDiffs()[0].getStageStatus()).toBe('partial')
      expect(viewModel.getFileDiffs()[0].getHunks()[0].getStageStatus()).toBe('staged')

      viewModel.toggleSelectedLinesStageStatus()
      expect(viewModel.getFileDiffs()[0].getStageStatus()).toBe('unstaged')
      expect(viewModel.getFileDiffs()[0].getHunks()[0].getStageStatus()).toBe('unstaged')
    })

    it("stages and unstages the selected line", function() {
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

  describe("handling events from the fileList", function() {
    beforeEach(function() {
      viewModel = createDiffs('fixtures/two-file-diff.txt')
    })

    it("emits an event when the fileDiff is updated", function() {
      let changeHandler = jasmine.createSpy()
      viewModel.onDidChange(changeHandler)
      fileDiff = viewModel.getFileDiffs()[0]

      fileDiff.fromString(FileStr)
      expect(changeHandler).toHaveBeenCalled()
    })
  })

  describe("opening the selected file", function() {
    beforeEach(function() {
      viewModel = createDiffs('fixtures/two-file-diff.txt')
      spyOn(atom.workspace, 'open')
    })

    it("opens the file to the first line in the selected hunk when in hunk mode and ::openFileAtSelection() is called", function() {
      viewModel.moveSelectionDown()

      viewModel.openFileAtSelection()
      expect(atom.workspace.open).toHaveBeenCalled()
      args = atom.workspace.open.mostRecentCall.args
      expect(args[0]).toBe('src/config.coffee')
      expect(args[1]).toEqual({initialLine: 433})
    })

    it("opens the file to the first selected line in line mode when ::openFileAtSelection() is called", function() {
      let selection = new DiffSelection(viewModel, {
        mode: 'line',
        headPosition: [0, 2, 4],
        tailPosition: [0, 2, 5]
      })
      viewModel.setSelection(selection)

      viewModel.openFileAtSelection()
      expect(atom.workspace.open).toHaveBeenCalled()
      args = atom.workspace.open.mostRecentCall.args
      expect(args[0]).toBe('src/config.coffee')
      expect(args[1]).toEqual({initialLine: 515})
    })
  })
})

FileStr = `FILE src/config.coffee - modified - unstaged
  HUNK @@ -85,9 +85,6 @@ ScopeDescriptor = require
  87 87   #
  88 --- - # We use [json schema]`
