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

describe('PushPullViewModel', () => {
  let viewModel, repositoryPath, parentRepositoryPath, gitStore, gitRepository, gitService, parentRepo

  beforeEach(async () => {
    jasmine.Clock.useMock()

    const paths = await cloneRepository()
    parentRepositoryPath = paths.parentRepositoryPath
    repositoryPath = paths.clonedRepositoryPath

    gitRepository = GitRepositoryAsync.open(repositoryPath, {refreshOnWindowFocus: false})
    gitService = new GitService(gitRepository)
    gitStore = new GitStore(gitService)

    await gitStore.loadFromGit()

    viewModel = new PushPullViewModel(gitStore)
    await viewModel.initialize()
  })

  afterEach(() => {
    gitService.destroy()
    gitRepository.destroy()
  })

  describe('pull', () => {
    it('brings in commits from the remote', async () => {
      const parentRepository = GitRepositoryAsync.open(parentRepositoryPath)
      const parentGitService = new GitService(parentRepository)
      const commitMessage = 'My Special Commit Message'
      await parentGitService.commit(commitMessage)

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
      await parentGitService.commit('Commit 1')
      await parentGitService.commit('Commit 2')

      atom.config.set('github.fetchIntervalInSeconds', 1)
      jasmine.Clock.tick(500)
      expect(viewModel.getBehindCount()).toBe(0)
      jasmine.Clock.tick(500)
      await until(() => viewModel.getBehindCount() === 2)

      await parentGitService.commit('Commit 3')

      atom.config.set('github.fetchIntervalInSeconds', 2)
      jasmine.Clock.tick(1000)
      expect(viewModel.getBehindCount()).toBe(2)
      jasmine.Clock.tick(1000)
      await until(() => viewModel.getBehindCount() === 3)

      parentGitService.destroy()
      parentRepository.destroy()
    })
  })

  describe('getBehindCount()', () => {
    it('returns the number of commits that can be pulled into the current branch', async () => {
      expect(viewModel.getBehindCount()).toBe(0)

      const parentRepository = GitRepositoryAsync.open(parentRepositoryPath)
      const parentGitService = new GitService(parentRepository)
      await parentGitService.commit('Commit 1')
      await parentGitService.commit('Commit 2')

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
