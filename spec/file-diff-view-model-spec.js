/** @babel */

import path from 'path'
import fs from 'fs-plus'
import {GitRepositoryAsync} from 'atom'
import GitStore from '../lib/git-store'
import GitService from '../lib/git-service'
import FileDiffViewModel from '../lib/file-diff-view-model'
import {copyRepository} from './helpers'
import {waitsForPromise} from './async-spec-helpers'

async function createDiffViewModel (gitService, fileName) {
  const gitStore = new GitStore(gitService)
  await gitStore.loadFromGit()
  const fileDiff = gitStore.getFileFromPathName(fileName)
  expect(fileDiff).toBeDefined()

  return new FileDiffViewModel(fileDiff)
}

describe('FileDiffViewModel', function () {
  const fileName = 'README.md'
  let filePath

  let gitService
  let repoPath

  beforeEach(() => {
    repoPath = copyRepository()

    gitService = new GitService(GitRepositoryAsync.open(repoPath))

    filePath = path.join(repoPath, fileName)
  })

  describe('.getTitle', () => {
    it('is the name of the changed files', () => {
      fs.writeFileSync(filePath, 'how now brown cow')

      let viewModel
      waitsForPromise(() => createDiffViewModel(gitService, fileName).then(v => viewModel = v))
      runs(() => {
        expect(viewModel.getTitle()).toBe(fileName)
      })
    })

    it('contains both the old and new name for renames', () => {
      const newFileName = 'REAMDE.md'
      fs.moveSync(filePath, path.join(repoPath, newFileName))

      let viewModel
      waitsForPromise(() => createDiffViewModel(gitService, newFileName).then(v => viewModel = v))
      runs(() => {
        const title = viewModel.getTitle()
        expect(title).toContain(fileName)
        expect(title).toContain(newFileName)
      })
    })
  })
})
