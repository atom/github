/** @babel */

import {GitRepositoryAsync} from 'atom'
import fs from 'fs-plus'
import path from 'path'
import temp from 'temp'
import GitService from '../lib/git-service'
import GitStore from '../lib/git-store'
import FileListViewModel from '../lib/file-list-view-model'
import DiffViewModel from '../lib/diff-view-model'

// Lifted from atom/atom
export function buildMouseEvent (type, properties) {
  if (properties.detail == null) {
    properties.detail = 1
  }
  if (properties.bubbles == null) {
    properties.bubbles = true
  }
  if (properties.cancelable == null) {
    properties.cancelable = true
  }

  let event = new MouseEvent(type, properties)
  if (properties.which != null) {
    Object.defineProperty(event, 'which', {
      get: function () {
        return properties.which
      }
    })
  }
  if (properties.target != null) {
    Object.defineProperty(event, 'target', {
      get: function () {
        return properties.target
      }
    })
    Object.defineProperty(event, 'srcObject', {
      get: function () {
        return properties.target
      }
    })
  }
  return event
}

temp.track()

export function copyRepository (name = 'test-repo') {
  const workingDirPath = temp.mkdirSync('git-fixture-')
  fs.copySync(path.join(__dirname, 'fixtures', name), workingDirPath)
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

export async function createFileListViewModel (name) {
  const gitStore = await createGitStore(name)
  return new FileListViewModel(gitStore, gitStore.gitService)
}

export async function createDiffViewModel (pathName, repoName) {
  const fileListViewModel = await createFileListViewModel(repoName)
  const gitStore = fileListViewModel.getGitStore()
  return new DiffViewModel({pathName, fileListViewModel, gitStore})
}
