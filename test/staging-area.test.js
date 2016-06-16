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
      fs.writeFileSync(path.join(workingDirPath, 'c.txt'), 'baz', 'utf8')

      let repo = await buildRepository(workingDirPath)
      let stage = repo.getStagingArea()

      await stage.refresh()

      // Return an array of ChangedFile objects representing a file with a diff
      // against the HEAD tree. These objects will back various parts of our
      // UI and maintain state about what is staged within Atom.

      // stage.getChangedFiles()
    })
  })
})
