/** @babel */

import {GitRepositoryAsync} from 'atom'
import fs from 'fs-plus'
import path from 'path'
import temp from 'temp'
import GitService from '../../lib/git/git-service'
import GitStore from '../../lib/git/git-store'
import FileListViewModel from '../../lib/git/file-list/file-list-view-model'
import DiffViewModel from '../../lib/git/diff/diff-view-model'

temp.track()

export function copyRepository (name = 'test-repo') {
  const workingDirPath = temp.mkdirSync('git-fixture-')
  fs.copySync(path.join(__dirname, '..', 'fixtures', name), workingDirPath)
  fs.renameSync(path.join(workingDirPath, 'git.git'), path.join(workingDirPath, '.git'))
  return fs.realpathSync(workingDirPath)
}

export async function createGitStore (name) {
  const repoPath = copyRepository(name)
  if (!name) {
    // If we're using the default fixture, put some changes in it.
    fs.writeFileSync(path.join(repoPath, 'README.md'), 'who can make the sun rise')
    fs.writeFileSync(path.join(repoPath, 'README2.md'), 'me too')
  }

  const gitService = new GitService(GitRepositoryAsync.open(repoPath))

  const gitStore = new GitStore(gitService)
  await gitStore.loadFromGit()
  return gitStore
}

export function stagePath (repo, path) {
  return GitRepositoryAsync.Git.Repository
    .open(repo)
    .then(repo => repo.index())
    .then(index => {
      index.addByPath(path)
      return index.write()
    })
}

export async function createFileListViewModel (name) {
  const gitStore = await createGitStore(name)
  return new FileListViewModel(gitStore)
}

export async function createDiffViewModel (pathName, repoName) {
  const fileListViewModel = await createFileListViewModel(repoName)
  const gitStore = fileListViewModel.getGitStore()
  return new DiffViewModel({pathName, fileListViewModel, gitStore})
}
