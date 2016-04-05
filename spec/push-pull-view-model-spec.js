/** @babel */

import {GitRepositoryAsync} from 'atom'
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

fdescribe('PushPullViewModel', () => {
  let viewModel
  let repoPath

  beforeEach(async () => {
    const {clonedRepository} = await cloneRepository()
    console.log(clonedRepository)

    repoPath = clonedRepository

    const gitService = new GitService(GitRepositoryAsync.open(repoPath))
    const gitStore = new GitStore(gitService)

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
      await viewModel.push()
    })
  })
})
