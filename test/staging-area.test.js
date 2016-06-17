/** @babel */

import fs from 'fs'
import path from 'path'
import {copyRepositoryDir, buildRepository} from './helpers'
import Repository from '../lib/repository'

describe('StagingArea', () => {
  describe('getChangedFiles', () => {
    it('returns an array of ChangedFile objects whose contents in the working copy differ from the repository HEAD', async () => {
      const workingDirPath = copyRepositoryDir(1)
      fs.writeFileSync(path.join(workingDirPath, 'a.txt'), 'foo\nbar', 'utf8')
      fs.unlinkSync(path.join(workingDirPath, 'b.txt'))
      fs.renameSync(path.join(workingDirPath, 'c.txt'), path.join(workingDirPath, 'd.txt'))
      fs.writeFileSync(path.join(workingDirPath, 'e.txt'), 'qux', 'utf8')

      const repo = await buildRepository(workingDirPath)
      const stage = repo.getStagingArea()
      assert.equal(stage.getChangedFiles().length, 0)
      await stage.refresh()
      assert.deepEqual(stage.getChangedFiles(), [
        {oldName: 'a.txt', newName: 'a.txt', status: 'modified'},
        {oldName: 'b.txt', newName: 'b.txt', status: 'deleted'},
        {oldName: 'c.txt', newName: 'd.txt', status: 'renamed'},
        {oldName: 'e.txt', newName: 'e.txt', status: 'created'}
      ])

      fs.unlinkSync(path.join(workingDirPath, 'e.txt'))
      fs.unlinkSync(path.join(workingDirPath, 'd.txt'))
      await stage.refresh()
      assert.deepEqual(stage.getChangedFiles(), [
        {oldName: 'a.txt', newName: 'a.txt', status: 'modified'},
        {oldName: 'b.txt', newName: 'b.txt', status: 'deleted'},
        {oldName: 'c.txt', newName: 'c.txt', status: 'deleted'}
      ])
    })
  })
})
