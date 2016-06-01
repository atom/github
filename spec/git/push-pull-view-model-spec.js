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

  const parentRepo = temp.mkdirSync('git-parent-fixture-')
  await GitRepositoryAsync.Git.Clone.clone(baseRepo, parentRepo, cloneOptions)

  const clonedPath = temp.mkdirSync('git-cloned-fixture-')
  cloneOptions.bare = 0
  await GitRepositoryAsync.Git.Clone.clone(parentRepo, clonedPath, cloneOptions)
  return {parentRepository: parentRepo, clonedRepository: clonedPath}
}

describe('PushPullViewModel', () => {
  let viewModel
  let repoPath
  let gitStore
  let parentRepo

  beforeEach(async () => {
    jasmine.Clock.useMock()

    const {clonedRepository, parentRepository} = await cloneRepository()

    repoPath = clonedRepository
    parentRepo = parentRepository

    const gitService = new GitService(GitRepositoryAsync.open(repoPath))
    gitStore = new GitStore(gitService)

    await gitStore.loadFromGit()

    viewModel = new PushPullViewModel(gitStore)
    await viewModel.initialize()
  })

  describe('pull', () => {
    it('brings in commits from the remote', async () => {
      const parentGitService = new GitService(GitRepositoryAsync.open(parentRepo))
      const commitMessage = 'My Special Commit Message'
      await parentGitService.commit(commitMessage)

      const repo = await GitRepositoryAsync.Git.Repository.open(repoPath)
      let masterCommit = await repo.getMasterCommit()

      await viewModel.pull()

      masterCommit = await repo.getMasterCommit()
      expect(masterCommit.message()).toBe(commitMessage)
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
      fs.writeFileSync(path.join(repoPath, fileName), 'this is a change')
      await stagePath(repoPath, fileName)

      const commitMessage = 'My Special Commit Message'
      await gitStore.commit(commitMessage)

      const repo = await GitRepositoryAsync.Git.Repository.open(parentRepo)
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
      const parentGitService = new GitService(GitRepositoryAsync.open(parentRepo))
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
    })
  })

  describe('getBehindCount()', () => {
    it('returns the number of commits that can be pulled into the current branch', async () => {
      expect(viewModel.getBehindCount()).toBe(0)

      const parentGitService = new GitService(GitRepositoryAsync.open(parentRepo))
      await parentGitService.commit('Commit 1')
      await parentGitService.commit('Commit 2')

      await viewModel.fetch()
      expect(viewModel.getBehindCount()).toBe(2)

      await viewModel.pull()
      expect(viewModel.getBehindCount()).toBe(0)
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
