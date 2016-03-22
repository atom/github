/** @babel */

import {beforeEach} from './async-spec-helpers'
import {createFileListViewModel} from './helpers'

describe('FileListViewModel', function () {
  let viewModel

  beforeEach(async () => {
    viewModel = await createFileListViewModel()
  })

  describe('moving the selection', function () {
    it('defaults to selecting the first item', function () {
      expect(viewModel.getSelectedIndex()).toBe(0)
    })

    it('moves the selection down on ::moveSelectionDown()', function () {
      expect(viewModel.getSelectedIndex()).toBe(0)
      viewModel.moveSelectionDown()
      expect(viewModel.getSelectedIndex()).toBe(1)
      viewModel.moveSelectionDown()
      viewModel.moveSelectionDown()
      expect(viewModel.getSelectedIndex()).toBe(1)
    })

    it('moves the selection up on ::moveSelectionUp()', function () {
      expect(viewModel.getSelectedIndex()).toBe(0)
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
