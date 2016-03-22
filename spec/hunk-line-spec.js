/** @babel */

import {GitRepositoryAsync} from 'atom'
import path from 'path'
import fs from 'fs-plus'
import FileList from '../lib/file-list'
import HunkLine from '../lib/hunk-line'
import GitService from '../lib/git-service'
import {waitsForPromise, runs} from './async-spec-helpers'
import {copyRepository} from './helpers'

describe('HunkLine', () => {
  let fileList = null
  let repoPath = null
  let gitService = null

  const fileName = 'README.md'
  let filePath = null

  beforeEach(() => {
    repoPath = copyRepository()

    filePath = path.join(repoPath, fileName)
    fs.writeFileSync(filePath, "i'm new here\n")

    gitService = new GitService(GitRepositoryAsync.open(repoPath))

    fileList = new FileList([], gitService)
    waitsForPromise(() => fileList.loadFromGitUtils())
  })

  it('roundtrips toString and HunkLine.fromString', () => {
    let line = '  89 --- - # default, the type it should be, etc. A simple example:'
    let hunkLine = HunkLine.fromString(line)
    expect(hunkLine.toString()).toEqual(line)

    line = '  435 432         scopeDescriptor = options.scope'
    hunkLine = HunkLine.fromString(line)
    expect(hunkLine.toString()).toEqual(line)

    line = '  --- 434 +     # Some new linesssss'
    hunkLine = HunkLine.fromString(line)
    expect(hunkLine.toString()).toEqual(line)

    line = '✓ --- 434 +     # Some new linesssss'
    hunkLine = HunkLine.fromString(line)
    expect(hunkLine.toString()).toEqual(line)

    line = '  85 85   #'
    hunkLine = HunkLine.fromString(line)
    expect(hunkLine.toString()).toEqual(line)
  })

  it('emits and event when HunkLine::fromString() is called', () => {
    let changeHandler = jasmine.createSpy()
    let line = '  89 --- - # default, the type it should be, etc. A simple example:'
    let hunkLine = new HunkLine()

    hunkLine.onDidChange(changeHandler)
    hunkLine.fromString(line)
    expect(changeHandler).toHaveBeenCalled()
    expect(hunkLine.toString()).toEqual(line)
  })

  describe('staging', () => {
    let getFirstLine
    let changeStagednessAndWait

    beforeEach(() => {
      getFirstLine = () => {
        const diff = fileList.getFileFromPathName(fileName)
        expect(diff).not.toBeUndefined()

        const hunks = diff.getHunks()
        const hunk = hunks[0]
        expect(hunk).not.toBeUndefined()

        const lines = hunk.getLines()
        return lines[0]
      }

      changeStagednessAndWait = (stage) => {
        const changeHandler = jasmine.createSpy()
        runs(() => {
          const line = getFirstLine()
          expect(line.isStaged()).toEqual(!stage)

          fileList.onDidUserChange(changeHandler)

          if (stage) {
            line.stage()
          } else {
            line.unstage()
          }
        })
        waitsFor(() => changeHandler.callCount === 1)
      }
    })

    describe('.stage()', () => {
      it('stages', () => {
        changeStagednessAndWait(true)
        runs(async () => {
          await fileList.loadFromGitUtils()

          const line = getFirstLine()
          expect(line.isStaged()).toEqual(true)
        })
      })
    })

    describe('.unstage()', () => {
      it('unstages', () => {
        changeStagednessAndWait(true)
        runs(async () => {
          await fileList.loadFromGitUtils()
        })

        changeStagednessAndWait(false)
        runs(async () => {
          await fileList.loadFromGitUtils()

          const line = getFirstLine()
          expect(line.isStaged()).toEqual(false)
        })
      })
    })
  })
})
