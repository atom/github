/** @babel */

import {GitRepositoryAsync} from 'atom'
// import fs from 'fs'
// import path from 'path'
import temp from 'temp'

import PushPullViewModel from '../lib/push-pull-view-model'
import GitService from '../lib/git-service'
import GitStore from '../lib/git-store'

import {beforeEach, it} from './async-spec-helpers'
import {copyRepository} from './helpers'

temp.track()

async function cloneRepository () {
  const repoPath = copyRepository()
  const parentRepo = await GitRepositoryAsync.Git.Repository.open(repoPath)
  const config = await parentRepo.config()
  await config.setString('core.bare', 'true')

  const clonedPath = temp.mkdirSync('git-fixture-')

  await GitRepositoryAsync.Git.Clone.clone(`${repoPath}/.git`, clonedPath)
  return {parentRepository: repoPath, clonedRepository: clonedPath}
}

describe('PushPullViewModel', () => {
  let viewModel
  let repoPath
  let gitStore

  beforeEach(async () => {
    const {clonedRepository} = await cloneRepository()
    console.log(clonedRepository)

    repoPath = clonedRepository

    const gitService = new GitService(GitRepositoryAsync.open(repoPath))
    gitStore = new GitStore(gitService)

    await gitStore.loadFromGit()

    viewModel = new PushPullViewModel(gitStore)
  })

  describe('pull', () => {
    it('brings in commits from the remote', async () => {
      await viewModel.pull()
    })
  })

  describe('push', () => {
    it('sends commits to the remote', async () => {
      // fs.writeFileSync(path.join(repoPath, 'README.md'), 'this is a change')
      // await stagePath(repoPath, 'README.md')
      // await gitStore.commit('sure')

      await viewModel.push()
    })
  })
})
