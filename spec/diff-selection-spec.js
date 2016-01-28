/** @babel */

import DiffSelection from '../lib/diff-selection'
import DiffViewModel from '../lib/diff-view-model'
import {createFileDiffsFromPath} from './helpers'

function createDiffs(filePath) {
  let fileDiffs = createFileDiffsFromPath(filePath)
  return new DiffViewModel({fileDiffs})
}

fdescribe("DiffSelection", function() {
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
})
