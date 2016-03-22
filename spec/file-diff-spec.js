/** @babel */

import {GitRepositoryAsync} from 'atom'
import path from 'path'
import fs from 'fs-plus'

import FileListStore from '../lib/file-list-store'
import GitService from '../lib/git-service'
import {copyRepository, createDiffViewModel} from './helpers'
import {it, runs} from './async-spec-helpers'

describe('FileDiff', function () {
  xdescribe('staging', () => {
    const fileName = 'README.md'
    let repoPath
    let filePath
    let fileListStore

    let getDiff
    let callAndWaitForEvent

    beforeEach(() => {
      repoPath = copyRepository()

      const gitService = new GitService(GitRepositoryAsync.open(repoPath))

      fileListStore = new FileListStore(gitService)

      filePath = path.join(repoPath, fileName)

      getDiff = async (fileName) => {
        await fileListStore.loadFromGitUtils()

        const diff = fileListStore.getFileFromPathName(fileName)
        expect(diff).toBeDefined()

        return diff
      }

      callAndWaitForEvent = (fn) => {
        const changeHandler = jasmine.createSpy()
        runs(async () => {
          fileListStore.onDidUpdate(changeHandler)
          await fn()
        })
        waitsFor(() => changeHandler.callCount === 1)
      }
    })

    describe('.stage()/.unstage()', () => {
      it('stages/unstages all hunks in a modified file', async () => {
        fs.writeFileSync(filePath, "oh the files, they are a'changin'")

        callAndWaitForEvent(async () => {
          const diff = await getDiff(fileName)
          expect(diff.getStageStatus()).toBe('unstaged')
          diff.stage()
        })
        callAndWaitForEvent(async () => {
          const diff = await getDiff(fileName)
          expect(diff.getStageStatus()).toBe('staged')
          diff.unstage()
        })
        runs(async () => {
          const diff = await getDiff(fileName)
          expect(diff.getStageStatus()).toBe('unstaged')
        })
      })

      it('stages/unstages all hunks in a modified file that ends in a newline', async () => {
        fs.writeFileSync(filePath, "oh the files, they are a'changin'\n")

        callAndWaitForEvent(async () => {
          const diff = await getDiff(fileName)
          expect(diff.getStageStatus()).toBe('unstaged')
          diff.stage()
        })
        callAndWaitForEvent(async () => {
          const diff = await getDiff(fileName)
          expect(diff.getStageStatus()).toBe('staged')
          diff.unstage()
        })
        runs(async () => {
          const diff = await getDiff(fileName)
          expect(diff.getStageStatus()).toBe('unstaged')
        })
      })

      it('stages/unstages all hunks in a renamed file', () => {
        const newFileName = 'REAMDE.md'
        const newFilePath = path.join(repoPath, newFileName)
        fs.moveSync(filePath, newFilePath)

        callAndWaitForEvent(async () => {
          const diff = await getDiff(newFileName)
          expect(diff.getStageStatus()).toBe('unstaged')
          diff.stage()
        })
        callAndWaitForEvent(async () => {
          const diff = await getDiff(newFileName)
          expect(diff.getStageStatus()).toBe('staged')
          diff.unstage()
        })
        runs(async () => {
          const diff = await getDiff(newFileName)
          expect(diff.getStageStatus()).toBe('unstaged')
        })
      })

      it('stages/unstages all hunks in a deleted file', () => {
        fs.removeSync(filePath)

        callAndWaitForEvent(async () => {
          const diff = await getDiff(fileName)
          expect(diff.getStageStatus()).toBe('unstaged')
          diff.stage()
        })
        callAndWaitForEvent(async () => {
          const diff = await getDiff(fileName)
          expect(diff.getStageStatus()).toBe('staged')
          diff.unstage()
        })
        runs(async () => {
          const diff = await getDiff(fileName)
          expect(diff.getStageStatus()).toBe('unstaged')
        })
      })

      it('stages/unstages all hunks in a new file', () => {
        const newFileName = 'REAMDE.md'
        const newFilePath = path.join(repoPath, newFileName)
        fs.writeFileSync(newFilePath, 'a whole new world')

        callAndWaitForEvent(async () => {
          const diff = await getDiff(newFileName)
          expect(diff.getStageStatus()).toBe('unstaged')
          diff.stage()
        })
        callAndWaitForEvent(async () => {
          const diff = await getDiff(newFileName)
          expect(diff.getStageStatus()).toBe('staged')
          diff.unstage()
        })
        runs(async () => {
          const diff = await getDiff(newFileName)
          expect(diff.getStageStatus()).toBe('unstaged')
        })
      })

      it('stages/unstages all hunks in a new file that ends in a newline', () => {
        const newFileName = 'REAMDE.md'
        const newFilePath = path.join(repoPath, newFileName)
        fs.writeFileSync(newFilePath, 'a whole new world\na new fantastic POV\n')

        callAndWaitForEvent(async () => {
          const diff = await getDiff(newFileName)
          expect(diff.getStageStatus()).toBe('unstaged')
          diff.stage()
        })
        callAndWaitForEvent(async () => {
          const diff = await getDiff(newFileName)
          expect(diff.getStageStatus()).toBe('staged')
          diff.unstage()
        })
        runs(async () => {
          const diff = await getDiff(newFileName)
          expect(diff.getStageStatus()).toBe('unstaged')
        })
      })
    })
  })

  it('returns "partial" from getStageStatus() when some of the hunks are staged', async () => {
    const viewModel = await createDiffViewModel('src/config.coffee', 'dummy-atom')

    let fileDiff = viewModel.getFileDiffs()[0]
    expect(fileDiff.getStageStatus()).toBe('unstaged')

    fileDiff.getHunks()[1].stage()
    expect(fileDiff.getStageStatus()).toBe('partial')

    fileDiff.getHunks()[1].unstage()
    expect(fileDiff.getStageStatus()).toBe('unstaged')
  })
})
