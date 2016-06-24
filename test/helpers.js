/** @babel */

import fs from 'fs-extra'
import path from 'path'
import temp from 'temp'
import {GitRepositoryAsync} from 'atom'

import Repository from '../lib/models/repository'

export function copyRepositoryDir (variant = 1) {
  const workingDirPath = temp.mkdirSync('git-fixture-')
  fs.copySync(path.join(__dirname, 'fixtures', 'repository-' + variant), workingDirPath)
  fs.renameSync(path.join(workingDirPath, 'dot-git'), path.join(workingDirPath, '.git'))
  return fs.realpathSync(workingDirPath)
}

export async function buildRepository (workingDirPath) {
  const atomRepository = GitRepositoryAsync.open(workingDirPath)
  const rawRepository = await atomRepository.repo.repoPromise
  return new Repository(rawRepository)
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
