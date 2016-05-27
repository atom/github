/** @babel */

import path from 'path'
import fs from 'fs-plus'
import {createFileListViewModel} from './git-helpers'

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

  describe('staging', () => {
    let filePath
    let repoPath
    let getDiff

    beforeEach(() => {
      repoPath = viewModel.gitStore.gitService.repoPath
      filePath = path.join(repoPath, 'README.md')

      getDiff = async (name) => {
        await viewModel.getGitStore().loadFromGit()
        return viewModel.getDiffForPathName(name)
      }
    })

    describe('.stage()/.unstage()', () => {
      it('stages/unstages the entirety of a modified file', async () => {
        fs.writeFileSync(filePath, "oh the files, they are a'changin'")

        let fileDiff = await getDiff('README.md')
        expect(fileDiff.getStageStatus()).toBe('unstaged')

        await viewModel.toggleFileStageStatus(fileDiff)
        fileDiff = await getDiff('README.md')
        expect(fileDiff.getStageStatus()).toBe('staged')

        await viewModel.toggleFileStageStatus(fileDiff)
        fileDiff = await getDiff('README.md')
        expect(fileDiff.getStageStatus()).toBe('unstaged')
      })

      it('stages/unstages the entirety of a modified file that ends in a newline', async () => {
        fs.writeFileSync(filePath, "oh the files, they are a'changin'\n")

        let fileDiff = await getDiff('README.md')
        expect(fileDiff.getStageStatus()).toBe('unstaged')

        await viewModel.toggleFileStageStatus(fileDiff)
        fileDiff = await getDiff('README.md')
        expect(fileDiff.getStageStatus()).toBe('staged')

        await viewModel.toggleFileStageStatus(fileDiff)
        fileDiff = await getDiff('README.md')
        expect(fileDiff.getStageStatus()).toBe('unstaged')
      })

      it('stages/unstages the entirety of a renamed file', async () => {
        const newFileName = 'REAMDE.md'
        const newFilePath = path.join(repoPath, newFileName)
        fs.moveSync(filePath, newFilePath)

        let fileDiff = await getDiff(newFileName)
        expect(fileDiff.getStageStatus()).toBe('unstaged')

        await viewModel.toggleFileStageStatus(fileDiff)
        fileDiff = await getDiff(newFileName)
        expect(fileDiff.getStageStatus()).toBe('staged')

        await viewModel.toggleFileStageStatus(fileDiff)
        fileDiff = await getDiff(newFileName)
        expect(fileDiff.getStageStatus()).toBe('unstaged')
      })

      it('stages/unstages the entirety of a deleted file', async () => {
        fs.removeSync(filePath)

        let fileDiff = await getDiff('README.md')
        expect(fileDiff.getStageStatus()).toBe('unstaged')

        await viewModel.toggleFileStageStatus(fileDiff)
        fileDiff = await getDiff('README.md')
        expect(fileDiff.getStageStatus()).toBe('staged')

        await viewModel.toggleFileStageStatus(fileDiff)
        fileDiff = await getDiff('README.md')
        expect(fileDiff.getStageStatus()).toBe('unstaged')
      })

      it('stages/unstages the entirety of a new file', async () => {
        const newFileName = 'REAMDE.md'
        const newFilePath = path.join(repoPath, newFileName)
        fs.writeFileSync(newFilePath, 'a whole new world')

        let fileDiff = await getDiff(newFileName)
        expect(fileDiff.getStageStatus()).toBe('unstaged')

        await viewModel.toggleFileStageStatus(fileDiff)
        fileDiff = await getDiff(newFileName)
        expect(fileDiff.getStageStatus()).toBe('staged')

        await viewModel.toggleFileStageStatus(fileDiff)
        fileDiff = await getDiff(newFileName)
        expect(fileDiff.getStageStatus()).toBe('unstaged')
      })

      it('stages/unstages the entirety of a new file that ends in a newline', async () => {
        const newFileName = 'REAMDE.md'
        const newFilePath = path.join(repoPath, newFileName)
        fs.writeFileSync(newFilePath, 'a whole new world\na new fantastic POV\n')

        let fileDiff = await getDiff(newFileName)
        expect(fileDiff.getStageStatus()).toBe('unstaged')

        await viewModel.toggleFileStageStatus(fileDiff)
        fileDiff = await getDiff(newFileName)
        expect(fileDiff.getStageStatus()).toBe('staged')

        await viewModel.toggleFileStageStatus(fileDiff)
        fileDiff = await getDiff(newFileName)
        expect(fileDiff.getStageStatus()).toBe('unstaged')
      })
    })
  })
})
