/** @babel */

import {GitRepositoryAsync} from 'atom'
import fs from 'fs'
import path from 'path'
import temp from 'temp'

import PushPullViewModel from '../lib/push-pull-view-model'
import GitService from '../lib/git-service'
import GitStore from '../lib/git-store'

import {beforeEach, it} from './async-spec-helpers'
import {copyRepository, stagePath} from './helpers'

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
    const {clonedRepository, parentRepository} = await cloneRepository()

    repoPath = clonedRepository
    parentRepo = parentRepository

    const gitService = new GitService(GitRepositoryAsync.open(repoPath))
    gitStore = new GitStore(gitService)

    await gitStore.loadFromGit()

    viewModel = new PushPullViewModel(gitStore)
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

    it('emits update events', async () => {
      const onUpdateSpy = jasmine.createSpy()
      viewModel.onDidUpdate(onUpdateSpy)
      await viewModel.pull()
      expect(onUpdateSpy.callCount).toBe(2)
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
      const onUpdateSpy = jasmine.createSpy()
      viewModel.onDidUpdate(onUpdateSpy)
      await viewModel.push()
      expect(onUpdateSpy.callCount).toBe(2)
    })
  })
})
