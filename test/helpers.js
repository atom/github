/** @babel */

import fs from 'fs-extra'
import path from 'path'
import temp from 'temp'
import {GitRepositoryAsync, Directory} from 'atom'

const Git = GitRepositoryAsync.Git

import Repository from '../lib/models/repository'

export function copyRepositoryDir (repoName = 1) {
  const workingDirPath = temp.mkdirSync('git-fixture-')
  fs.copySync(path.join(__dirname, 'fixtures', `repo-${repoName}`), workingDirPath)
  fs.renameSync(path.join(workingDirPath, 'dot-git'), path.join(workingDirPath, '.git'))
  return fs.realpathSync(workingDirPath)
}

export async function buildRepository (workingDirPath) {
  const rawRepository = await Git.Repository.open(workingDirPath)
  return new Repository(rawRepository, new Directory(workingDirPath))
}

export function assertDeepPropertyVals (actual, expected) {
  function extractObjectSubset (actual, expected) {
    if (actual !== Object(actual)) return actual

    let actualSubset = Array.isArray(actual) ? [] : {}
    for (let key of Object.keys(expected)) {
      if (actual.hasOwnProperty(key)) {
        actualSubset[key] = extractObjectSubset(actual[key], expected[key])
      }
    }

    return actualSubset
  }

  assert.deepEqual(extractObjectSubset(actual, expected), expected)
}

export async function cloneRepository () {
  const baseRepo = copyRepositoryDir('three-files')
  const cloneOptions = new Git.CloneOptions()
  cloneOptions.bare = 1
  cloneOptions.local = 1

  const remoteRepoPath = temp.mkdirSync('git-remote-fixture-')
  await Git.Clone.clone(baseRepo, remoteRepoPath, cloneOptions)

  const localRepoPath = temp.mkdirSync('git-cloned-fixture-')
  cloneOptions.bare = 0
  await Git.Clone.clone(remoteRepoPath, localRepoPath, cloneOptions)
  return {remoteRepoPath, localRepoPath}
}

export async function createEmptyCommit (repoPath, message) {
  const repo = await Git.Repository.open(repoPath)
  const head = await repo.getHeadCommit()
  const tree = await head.getTree()
  const parents = [head]
  const author = Git.Signature.default(repo)

  return repo.createCommit('HEAD', author, author, message, tree, parents)
}
