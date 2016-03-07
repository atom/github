/** @babel */

import path from 'path'
import fs from 'fs-plus'

import FileDiff from '../lib/file-diff'
import FileList from '../lib/file-list'
import GitService from '../lib/git-service'
import {createFileDiffsFromPath, copyRepository} from './helpers'
import {it, runs} from './async-spec-helpers'

describe('FileDiff', function () {
  it('roundtrips toString and fromString', function () {
    let file = FileStr
    let fileDiff = FileDiff.fromString(file)
    expect(fileDiff.toString()).toEqual(file)
  })

  describe('staging', () => {
    const fileName = 'README.md'
    let repoPath
    let filePath
    let fileList

    let getDiff
    let callAndWaitForEvent

    beforeEach(() => {
      repoPath = copyRepository()

      const gitService = new GitService(repoPath)

      fileList = new FileList([], gitService, {stageOnChange: true})

      filePath = path.join(repoPath, fileName)

      getDiff = async (fileName) => {
        await fileList.loadFromGitUtils()

        const diff = fileList.getFileFromPathName(fileName)
        expect(diff).toBeDefined()

        return diff
      }

      callAndWaitForEvent = (fn) => {
        const changeHandler = jasmine.createSpy()
        runs(async () => {
          fileList.onDidUserChange(changeHandler)
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
    })
  })

  it('returns "partial" from getStageStatus() when some of the hunks are staged', function () {
    let fileDiff = createFileDiffsFromPath('fixtures/two-file-diff.txt')[0]
    expect(fileDiff.getStageStatus()).toBe('unstaged')

    fileDiff.getHunks()[1].stage()
    expect(fileDiff.getStageStatus()).toBe('partial')

    fileDiff.getHunks()[1].unstage()
    expect(fileDiff.getStageStatus()).toBe('unstaged')
  })

  it('emits an event when FileDiff::fromString() is called', function () {
    let changeHandler = jasmine.createSpy()
    let file = FileStr
    let fileDiff = new FileDiff()
    fileDiff.onDidChange(changeHandler)

    fileDiff.fromString(file)
    expect(changeHandler).toHaveBeenCalled()
    expect(fileDiff.toString()).toEqual(file)
  })

  it('emits one change event when the file is staged', function () {
    let changeHandler = jasmine.createSpy()
    let fileDiff = createFileDiffsFromPath('fixtures/two-file-diff.txt')[0]
    fileDiff.onDidChange(changeHandler)

    fileDiff.stage()
    expect(changeHandler.callCount).toBe(1)
  })

  it('emits a change event when a hunk is staged', function () {
    let changeHandler = jasmine.createSpy()
    let fileDiff = createFileDiffsFromPath('fixtures/two-file-diff.txt')[0]
    fileDiff.onDidChange(changeHandler)

    fileDiff.getHunks()[1].stage()
    expect(changeHandler).toHaveBeenCalled()
  })
})

const FileStr = `FILE src/config.coffee - modified - unstaged
HUNK @@ -85,9 +85,6 @@ ScopeDescriptor = require './scope-descriptor'
  85 85   #
  86 86   # ## Config Schemas
  87 87   #
  88 --- - # We use [json schema](http://json-schema.org) which allows you to define your value's
  89 --- - # default, the type it should be, etc. A simple example:
  90 --- - #
  91 88   # \`\`\`coffee
  92 89   # # We want to provide an \`enableThing\`, and a \`thingVolume\`
  93 90   # config:`
