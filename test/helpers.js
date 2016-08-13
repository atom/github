/** @babel */

import fs from 'fs-extra'
import path from 'path'
import temp from 'temp'
import {Directory} from 'atom'
import Git from 'nodegit'
import GitShellOutStrategy from '../lib/git-shell-out-strategy'

import Repository from '../lib/models/repository'

export async function cloneRepository (repoName = 'three-files') {
  const workingDirPath = temp.mkdirSync('git-fixture-')
  const git = new GitShellOutStrategy(workingDirPath)
  await git.clone(path.join(__dirname, 'fixtures', `repo-${repoName}`, 'dot-git'))
  return fs.realpathSync(workingDirPath)
}

export async function createLocalAndRemoteRepositories (repoName = 'multiple-commits') {
  const baseRepoPath = await cloneRepository(repoName)
  const baseGit = new GitShellOutStrategy(baseRepoPath)

  // create remote bare repo with all commits
  const remoteRepoPath = temp.mkdirSync('git-remote-fixture-')
  const remoteGit = new GitShellOutStrategy(remoteRepoPath)
  await remoteGit.clone(baseRepoPath, {bare: true})

  // create local repo with one fewer commit
  await baseGit.exec(['reset', 'head~'])
  const localRepoPath = temp.mkdirSync('git-local-fixture-')
  const localGit = new GitShellOutStrategy(localRepoPath)
  await localGit.clone(baseRepoPath)
  await localGit.exec(['remote', 'set-url', 'origin', remoteRepoPath])
  return {baseRepoPath, remoteRepoPath, localRepoPath}
}

export function buildRepository (workingDirPath) {
  return Repository.open(new Directory(workingDirPath))
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

export async function createEmptyCommit (repoPath, message) {
  const repo = await Git.Repository.open(repoPath)
  const head = await repo.getHeadCommit()
  const tree = await head.getTree()
  const parents = [head]
  const author = Git.Signature.default(repo)

  return repo.createCommit('HEAD', author, author, message, tree, parents)
}
