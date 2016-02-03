/** @babel */

import DiffSelection from '../lib/diff-selection'
import DiffViewModel from '../lib/diff-view-model'
import FileList from '../lib/file-list'
import {createFileDiffsFromPath} from './helpers'

function createDiffs(filePath) {
  let fileDiffs = createFileDiffsFromPath(filePath)
  return new DiffViewModel({fileList: new FileList(fileDiffs)})
}

describe("DiffSelection", function() {
  let viewModel
  beforeEach(function() {
    viewModel = createDiffs('fixtures/two-file-diff.txt')
  })

  it("can be created without options", function() {
    let selection = new DiffSelection(viewModel)
    expect(selection.getMode()).toEqual('hunk')
    expect(selection.getHeadPosition()).toEqual([0, 0])
    expect(selection.getTailPosition()).toEqual([0, 0])
  })

  it("can be created with options", function() {
    let selection = new DiffSelection(viewModel, {
      mode: 'line',
      headPosition: [0, 1, 1],
      tailPosition: [0, 1, 3]
    })
    expect(selection.getMode()).toEqual('line')
    expect(selection.getHeadPosition()).toEqual([0, 1, 1])
    expect(selection.getTailPosition()).toEqual([0, 1, 3])
  })

  describe("sorting selections", function() {
    it("::sortSelectionsAscending()", function() {
      let selectionBottom = new DiffSelection(viewModel, {
        mode: 'line',
        headPosition: [0, 1, 3],
        tailPosition: [0, 1, 1]
      })
      let selectionTop = new DiffSelection(viewModel, {
        mode: 'line',
        headPosition: [0, 2, 3],
        tailPosition: [0, 1, 0],
      })
      let selections = [selectionBottom, selectionTop]
      let sortedSelections = DiffSelection.sortSelectionsAscending(selections)
      expect(sortedSelections[0]).toBe(selectionTop)
      expect(sortedSelections[1]).toBe(selectionBottom)
    })

    it("::sortSelectionsDescending()", function() {
      let selectionTop = new DiffSelection(viewModel, {
        mode: 'line',
        headPosition: [0, 1, 3],
        tailPosition: [0, 0, 1]
      })
      let selectionBottom = new DiffSelection(viewModel, {
        mode: 'line',
        headPosition: [0, 2, 3],
        tailPosition: [0, 1, 0],
      })
      let selections = [selectionTop, selectionBottom]
      let sortedSelections = DiffSelection.sortSelectionsDescending(selections)
      expect(sortedSelections[0]).toBe(selectionBottom)
      expect(sortedSelections[1]).toBe(selectionTop)
    })
  })
})
