/** @babel */

import {GitRepositoryAsync} from 'atom'
import fs from 'fs'
import path from 'path'
import temp from 'temp'

import PushPullViewModel from '../../lib/git/push-pull/push-pull-view-model'
import GitService from '../../lib/git/git-service'
import GitStore from '../../lib/git/git-store'

import {copyRepository, stagePath} from './git-helpers'

temp.track()

async function cloneRepository () {
  const baseRepo = copyRepository()
  const cloneOptions = new GitRepositoryAsync.Git.CloneOptions()
  cloneOptions.bare = 1
  cloneOptions.local = 1

  const parentRepoPath = temp.mkdirSync('git-parent-fixture-')
  await GitRepositoryAsync.Git.Clone.clone(baseRepo, parentRepoPath, cloneOptions)

  const clonedPath = temp.mkdirSync('git-cloned-fixture-')
  cloneOptions.bare = 0
  await GitRepositoryAsync.Git.Clone.clone(parentRepoPath, clonedPath, cloneOptions)
  return {parentRepositoryPath: parentRepoPath, clonedRepositoryPath: clonedPath}
}

async function createEmptyCommit (repoPath, message) {
  const repo = await GitRepositoryAsync.Git.Repository.open(repoPath)
  const head = await repo.getHeadCommit()
  const tree = await head.getTree()
  const parents = [head]
  const author = GitRepositoryAsync.Git.Signature.default(repo)
  return repo.createCommit('HEAD', author, author, message, tree, parents)
}

fdescribe('PushPullViewModel', () => {
  let viewModel, repositoryPath, parentRepositoryPath, gitStore, gitRepository, gitService

  beforeEach(async () => {
    spyOn(window, 'setInterval').andCallFake(window.fakeSetInterval)
    spyOn(window, 'clearInterval').andCallFake(window.fakeClearInterval)

    const paths = await cloneRepository()
    parentRepositoryPath = paths.parentRepositoryPath
    repositoryPath = paths.clonedRepositoryPath

    gitRepository = GitRepositoryAsync.open(repositoryPath)
    gitService = new GitService(gitRepository)
    gitStore = new GitStore(gitService)

    await gitStore.loadFromGit()

    viewModel = new PushPullViewModel(gitStore)
    await viewModel.initialize()
  })

  afterEach(() => {
    gitStore.destroy()
    gitService.destroy()
    gitRepository.destroy()
  })

  describe('pull', () => {
    it('brings in commits from the remote', async () => {
      const parentRepository = GitRepositoryAsync.open(parentRepositoryPath)
      const parentGitService = new GitService(parentRepository)
      const commitMessage = 'My Special Commit Message'
      await createEmptyCommit(parentRepositoryPath, commitMessage)

      const repo = await GitRepositoryAsync.Git.Repository.open(repositoryPath)
      let masterCommit = await repo.getMasterCommit()

      await viewModel.pull()

      masterCommit = await repo.getMasterCommit()
      expect(masterCommit.message()).toBe(commitMessage)

      parentGitService.destroy()
      parentRepository.destroy()
    })

    it('emits update events when making progress', async () => {
      const progressReports = []
      viewModel.onDidUpdate(() => progressReports.push(viewModel.getProgressPercentage()))
      await viewModel.pull()
      expect(progressReports).toEqual([0, 80, 100])
    })
  })

  describe('push', () => {
    it('sends commits to the remote', async () => {
      const fileName = 'README.md'
      fs.writeFileSync(path.join(repositoryPath, fileName), 'this is a change')
      await stagePath(repositoryPath, fileName)

      const commitMessage = 'My Special Commit Message'
      await gitStore.commit(commitMessage)

      const repo = await GitRepositoryAsync.Git.Repository.open(parentRepositoryPath)
      let commit = await repo.getMasterCommit()
      expect(commit.message()).not.toBe(commitMessage)

      await viewModel.push()

      commit = await repo.getMasterCommit()
      expect(commit.message()).toBe(commitMessage)
    })

    it('emits update events', async () => {
      const progressReports = []
      viewModel.onDidUpdate(() => progressReports.push(viewModel.getProgressPercentage()))
      await viewModel.push()
      expect(progressReports).toEqual([0, 100])
    })
  })

  describe('fetch', () => {
    it('performs fetches automatically every `github.fetchIntervalInSeconds` seconds', async () => {
      const parentRepository = GitRepositoryAsync.open(parentRepositoryPath)
      const parentGitService = new GitService(parentRepository)
      await createEmptyCommit(parentRepositoryPath, 'Commit 1')
      await createEmptyCommit(parentRepositoryPath, 'Commit 2')

      atom.config.set('github.fetchIntervalInSeconds', 1)
      expect(viewModel.hasRequestsInFlight()).toBe(false)
      window.advanceClock(500)
      expect(viewModel.hasRequestsInFlight()).toBe(false)
      window.advanceClock(500)
      expect(viewModel.hasRequestsInFlight()).toBe(true)
      await until(() => !viewModel.hasRequestsInFlight())
      expect(viewModel.getBehindCount()).toBe(2)

      await createEmptyCommit(parentRepositoryPath, 'Commit 3')

      atom.config.set('github.fetchIntervalInSeconds', 0.5)
      expect(viewModel.hasRequestsInFlight()).toBe(false)
      window.advanceClock(250)
      expect(viewModel.hasRequestsInFlight()).toBe(false)
      window.advanceClock(250)
      expect(viewModel.hasRequestsInFlight()).toBe(true)
      await until(() => !viewModel.hasRequestsInFlight())
      expect(viewModel.getBehindCount()).toBe(3)

      parentGitService.destroy()
      parentRepository.destroy()
    })
  })

  describe('getBehindCount()', () => {
    it('returns the number of commits that can be pulled into the current branch', async () => {
      expect(viewModel.getBehindCount()).toBe(0)

      const parentRepository = GitRepositoryAsync.open(parentRepositoryPath)
      const parentGitService = new GitService(parentRepository)
      await createEmptyCommit(parentRepositoryPath, 'Commit 1')
      await createEmptyCommit(parentRepositoryPath, 'Commit 2')

      await viewModel.fetch()
      expect(viewModel.getBehindCount()).toBe(2)

      await viewModel.pull()
      expect(viewModel.getBehindCount()).toBe(0)

      parentGitService.destroy()
      parentRepository.destroy()
    })
  })

  describe('getAheadCount()', () => {
    it('returns the number of commits that can be pushed to the remote', async () => {
      expect(viewModel.getAheadCount()).toBe(0)

      await gitStore.commit('Commit 1')
      await gitStore.commit('Commit 2')
      await until(() => viewModel.getAheadCount() === 2)

      await viewModel.push()
      expect(viewModel.getAheadCount()).toBe(0)
    })
  })
})
