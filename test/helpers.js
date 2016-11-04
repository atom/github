/** @babel */

import fs from 'fs-extra'
import path from 'path'
import temp from 'temp'
import {Directory} from 'atom'
import GitShellOutStrategy from '../lib/git-shell-out-strategy'

import Repository from '../lib/models/repository'

assert.autocrlfEqual = (actual, expected, ...args) => {
  actual = actual.replace(/\r\n/g, '\n')
  expected = expected.replace(/\r\n/g, '\n')
  return assert.equal(actual, expected, ...args)
}

// cloning a repo into a folder and then copying it
// for each subsequent request to clone makes cloning
// 2-3x faster on macOS and 5-10x faster on Windows
const cachedClonedRepos = {}
function copyCachedRepo(repoName) {
  const workingDirPath = temp.mkdirSync('git-fixture-')
  fs.copySync(cachedClonedRepos[repoName], workingDirPath)
  return fs.realpathSync(workingDirPath)
}

export async function cloneRepository (repoName = 'three-files') {
  if (!cachedClonedRepos[repoName]) {
    const cachedPath = temp.mkdirSync('git-fixture-cache-')
    const git = new GitShellOutStrategy(cachedPath)
    await git.clone(path.join(__dirname, 'fixtures', `repo-${repoName}`, 'dot-git'))
    cachedClonedRepos[repoName] = cachedPath
  }
  return copyCachedRepo(repoName)
}

export async function setUpLocalAndRemoteRepositories (repoName = 'multiple-commits', options = {}) {
  if (typeof repoName === 'object') {
    options = repoName
    repoName = 'multiple-commits'
  }
  const baseRepoPath = await cloneRepository(repoName)
  const baseGit = new GitShellOutStrategy(baseRepoPath)

  // create remote bare repo with all commits
  const remoteRepoPath = temp.mkdirSync('git-remote-fixture-')
  const remoteGit = new GitShellOutStrategy(remoteRepoPath)
  await remoteGit.clone(baseRepoPath, {bare: true})

  // create local repo with one fewer commit
  if (options.remoteAhead) await baseGit.exec(['reset', 'head~'])
  const localRepoPath = temp.mkdirSync('git-local-fixture-')
  const localGit = new GitShellOutStrategy(localRepoPath)
  await localGit.clone(baseRepoPath)
  await localGit.exec(['remote', 'set-url', 'origin', remoteRepoPath])
  return {baseRepoPath, remoteRepoPath, localRepoPath}
}

export async function getHeadCommitOnRemote (remotePath) {
  const workingDirPath = temp.mkdirSync('git-fixture-')
  const git = new GitShellOutStrategy(workingDirPath)
  await git.clone(remotePath)
  return git.getHeadCommit()
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
