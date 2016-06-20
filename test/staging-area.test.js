/** @babel */

import fs from 'fs'
import path from 'path'
import {copyRepositoryDir, buildRepository, assertDeepPropertyVals} from './helpers'
import Repository from '../lib/repository'

describe('StagingArea', () => {
  describe('the "did-change" event', () => {
    it('triggers after calling `refresh`', async () => {
      const workingDirPath = copyRepositoryDir(1)
      const repo = await buildRepository(workingDirPath)

      let eventCount = 0
      const stage = repo.getStagingArea()
      stage.onDidChange(() => eventCount++)

      await stage.refresh()
      assert.equal(eventCount, 1)

      await stage.refresh()
      assert.equal(eventCount, 2)
    })
  })

  describe('getChangedFiles', () => {
    it('returns an array of ChangedFile objects whose contents in the working copy differ from the repository HEAD', async () => {
      const workingDirPath = copyRepositoryDir(1)
      fs.writeFileSync(path.join(workingDirPath, 'a.txt'), 'qux\nfoo\nbar\n', 'utf8')
      fs.unlinkSync(path.join(workingDirPath, 'b.txt'))
      fs.renameSync(path.join(workingDirPath, 'c.txt'), path.join(workingDirPath, 'd.txt'))
      fs.writeFileSync(path.join(workingDirPath, 'e.txt'), 'qux', 'utf8')

      const repo = await buildRepository(workingDirPath)
      const stage = repo.getStagingArea()
      assert.equal(stage.getChangedFiles().length, 0)

      await stage.refresh()

      assertDeepPropertyVals(stage.getChangedFiles(), [
        {
          oldName: 'a.txt',
          newName: 'a.txt',
          status: 'modified',
          hunks: [
            {
              lines: [
                {status: 'added', text: 'qux', oldLineNumber: -1, newLineNumber: 1},
                {status: 'unchanged', text: 'foo', oldLineNumber: 1, newLineNumber: 2},
                {status: 'added', text: 'bar', oldLineNumber: -1, newLineNumber: 3}
              ]
            }
          ]
        },
        {
          oldName: 'b.txt',
          newName: 'b.txt',
          status: 'deleted',
          hunks: [
            {
              lines: [
                {status: 'deleted', text: 'bar', oldLineNumber: 1, newLineNumber: -1},
              ]
            }
          ]
        },
        {
          oldName: 'c.txt',
          newName: 'd.txt',
          status: 'renamed',
          hunks: []
        },
        {
          oldName: 'e.txt',
          newName: 'e.txt',
          status: 'created',
          hunks: [
            {
              lines: [
                {status: 'added', text: 'qux', oldLineNumber: -1, newLineNumber: 1},
                {status: 'unchanged', text: '\n\\ No newline at end of file', oldLineNumber: -1, newLineNumber: 1}
              ]
            }
          ]
        }
      ])

      fs.unlinkSync(path.join(workingDirPath, 'e.txt'))
      fs.unlinkSync(path.join(workingDirPath, 'd.txt'))
      await stage.refresh()
      assertDeepPropertyVals(stage.getChangedFiles(), [
        {
          oldName: 'a.txt',
          newName: 'a.txt',
          status: 'modified',
          hunks: [
            {
              lines: [
                {status: 'added', text: 'qux', oldLineNumber: -1, newLineNumber: 1},
                {status: 'unchanged', text: 'foo', oldLineNumber: 1, newLineNumber: 2},
                {status: 'added', text: 'bar', oldLineNumber: -1, newLineNumber: 3}
              ]
            }
          ]
        },
        {
          oldName: 'b.txt',
          newName: 'b.txt',
          status: 'deleted',
          hunks: [
            {
              lines: [
                {status: 'deleted', text: 'bar', oldLineNumber: 1, newLineNumber: -1},
              ]
            }
          ]
        },
        {
          oldName: 'c.txt',
          newName: 'c.txt',
          status: 'deleted',
          hunks: [
            {
              lines: [
                {status: 'deleted', text: 'baz', oldLineNumber: 1, newLineNumber: -1},
              ]
            }
          ]
        }
      ])
    })
  })
})
