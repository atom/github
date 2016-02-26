/** @babel */

import path from 'path'
import fs from 'fs-plus'
import FileList from '../lib/file-list'
import HunkLine from '../lib/hunk-line'
import GitService from '../lib/git-service'
import {waitsForPromise} from './async-spec-helpers'
import {copyRepository} from './helpers'

describe('HunkLine', () => {
  let fileList = null
  let repoPath = null

  const fileName = 'README.md'
  let filePath = null

  beforeEach(() => {
    repoPath = copyRepository()

    filePath = path.join(repoPath, fileName)
    fs.writeFileSync(filePath, "i'm new here\n")

    // TODO: This makes me feel gross inside.
    GitService.instance().repoPath = repoPath

    fileList = new FileList([], {stageOnChange: true})
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

  fdescribe('staging', () => {
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
        const line = getFirstLine()
        expect(line.isStaged()).toEqual(!stage)

        const changeHandler = jasmine.createSpy()
        fileList.onDidUserChange(changeHandler)

        if (stage) {
          line.stage()
        } else {
          line.unstage()
        }

        waitsFor(() => changeHandler.callCount === 1)
      }
    })

    describe('.stage()', () => {
      it('stages', () => {
        changeStagednessAndWait(true)
        runs(() => {
          waitsForPromise(() => fileList.loadFromGitUtils())
          runs(() => {
            const line = getFirstLine()
            expect(line.isStaged()).toEqual(true)
          })
        })
      })
    })

    describe('.unstage()', () => {
      it('unstages', () => {
        // All this crazy nesting *shouldn't* be necessary. But Jasmine is
        // terrible.
        changeStagednessAndWait(true)
        runs(() => {
          waitsForPromise(() => fileList.loadFromGitUtils())
          runs(() => {
            changeStagednessAndWait(false)
            runs(() => {
              waitsForPromise(() => fileList.loadFromGitUtils())
              runs(() => {
                const line = getFirstLine()
                expect(line.isStaged()).toEqual(false)
              })
            })
          })
        })
      })
    })
  })
})
