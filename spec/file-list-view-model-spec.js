/** @babel */

import {GitRepositoryAsync} from 'atom'
import FileList from '../lib/file-list'
import FileListViewModel from '../lib/file-list-view-model'
import GitService from '../lib/git-service'
import {createFileDiffsFromPath, copyRepository} from './helpers'

function createFileList (filePath, gitService) {
  let fileDiffs = createFileDiffsFromPath(filePath)
  let fileList = new FileList(fileDiffs, gitService, {stageOnChange: false})
  return new FileListViewModel(fileList)
}

describe('FileListViewModel', function () {
  let viewModel
  let gitService

  beforeEach(function () {
    const repoPath = copyRepository()
    gitService = new GitService(GitRepositoryAsync.open(repoPath))
    viewModel = createFileList('fixtures/two-file-diff.txt', gitService)
  })

  describe('moving the selection', function () {
    it('defaults to selecting the first item', function () {
      expect(viewModel.getSelectedIndex()).toBe(0)
    })

    it('moves the selection down on ::moveSelectionDown()', function () {
      viewModel.moveSelectionDown()
      expect(viewModel.getSelectedIndex()).toBe(1)
      viewModel.moveSelectionDown()
      viewModel.moveSelectionDown()
      expect(viewModel.getSelectedIndex()).toBe(1)
    })

    it('moves the selection up on ::moveSelectionUp()', function () {
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
