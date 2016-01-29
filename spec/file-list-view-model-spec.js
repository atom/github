/** @babel */

import FileList from '../lib/file-list'
import FileListViewModel from '../lib/file-list-view-model'
import {createFileDiffsFromPath} from './helpers'

function createFileList(filePath) {
  let fileDiffs = createFileDiffsFromPath(filePath)
  let fileList = new FileList(fileDiffs)
  return new FileListViewModel(fileList)
}

describe("FileListViewModel", function() {
  let viewModel

  beforeEach(function() {
    viewModel = createFileList('fixtures/two-file-diff.txt')
  })

  describe("moving the selection", function() {
    it("defaults to selecting the first item", function() {
      expect(viewModel.getSelectedIndex()).toBe(0)
    })

    it("moves the selection down on ::moveSelectionDown()", function() {
      viewModel.moveSelectionDown()
      expect(viewModel.getSelectedIndex()).toBe(1)
      viewModel.moveSelectionDown()
      viewModel.moveSelectionDown()
      expect(viewModel.getSelectedIndex()).toBe(1)
    })

    it("moves the selection up on ::moveSelectionUp()", function() {
      viewModel.moveSelectionDown()
      viewModel.moveSelectionDown()
      expect(viewModel.getSelectedIndex()).toBe(1)
      viewModel.moveSelectionUp()
      expect(viewModel.getSelectedIndex()).toBe(0)
      viewModel.moveSelectionUp()
      viewModel.moveSelectionUp()
      expect(viewModel.getSelectedIndex()).toBe(0)
    })
  })
})
