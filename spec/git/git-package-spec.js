/** @babel */

import path from 'path'
import fs from 'fs-plus'
import {GitRepository} from 'atom'
import DiffViewModel from '../../lib/git/diff/diff-view-model'
import GitPackage from '../../lib/git/git-package'
import {copyRepository} from './git-helpers'

function commit (fileListViewModel, msg) {
  const fileList = fileListViewModel.fileList
  const fileDiff = fileList.getFiles()[0]

  const changeHandler = jasmine.createSpy()
  const commitHandler = jasmine.createSpy()
  runs(() => {
    fileList.onDidUserChange(changeHandler)
    fileDiff.stage()
  })
  waitsFor('staging', () => changeHandler.callCount === 1)
  runs(() => {
    const commitViewModel = fileListViewModel.commitBoxViewModel
    commitViewModel.onDidCommit(commitHandler)
    commitViewModel.commit(msg)
  })
  waitsFor('committing', () => commitHandler.callCount === 1)
}

describe('GitPackage', function () {
  let gitPackage

  beforeEach(() => {
    gitPackage = new GitPackage()
    gitPackage.activate()
  })

  afterEach(() => {
    gitPackage.deactivate()
  })

  describe('setActivePaneItem', () => {
    beforeEach(() => {
      spyOn(gitPackage, 'setActiveGitRepository').andCallThrough()
    })

    describe('when the active pane item is set to null', () => {
      it('assigns the active repository based on the first repository in the project unless an active repository is already assigned', async () => {
        const repoPath = copyRepository('test-repo')
        atom.project.setPaths([repoPath])
        await gitPackage.setActivePaneItem(null)
        expect(gitPackage.setActiveGitRepository).toHaveBeenCalledWith(atom.project.getRepositories()[0])

        gitPackage.setActiveGitRepository.reset()
        await gitPackage.setActivePaneItem(null)
        expect(gitPackage.setActiveGitRepository).not.toHaveBeenCalled()
      })

      it('does not assign the active repository if there are no repositories in the project', async () => {
        atom.project.setPaths([])
        await gitPackage.setActivePaneItem(null)
        expect(gitPackage.setActiveGitRepository).not.toHaveBeenCalled()
      })
    })

    describe('when the active pane item is set to an item with a getPath method', () => {
      describe('if a repository corresponding to the path of the item exists in the project', () => {
        it('assigns the active repository to the repository corresponding to the given path if it differs from the current active repository', async () => {
          const repoPath1 = copyRepository('test-repo')
          const repoPath2 = copyRepository('dummy-atom')
          atom.project.setPaths([repoPath1, repoPath2])
          await gitPackage.setActivePaneItem({getPath: () => repoPath2 + '/foo.txt'})
          expect(gitPackage.setActiveGitRepository).toHaveBeenCalledWith(atom.project.getRepositories()[1])

          await gitPackage.setActivePaneItem({getPath: () => repoPath1 + '/foo.txt'})
          expect(gitPackage.setActiveGitRepository).toHaveBeenCalledWith(atom.project.getRepositories()[0])

          gitPackage.setActiveGitRepository.reset()
          await gitPackage.setActivePaneItem({getPath: () => repoPath1 + '/foo.txt'})
          expect(gitPackage.setActiveGitRepository).not.toHaveBeenCalled()
        })
      })

      describe('if a repository corresponding to the path of the item does not exist in the project', () => {
        it('assigns the active repository based on the first repository in the project unless an active repository already exists', async () => {
          const repoPath1 = copyRepository('test-repo')
          const repoPath2 = copyRepository('dummy-atom')
          atom.project.setPaths([repoPath1, repoPath2])
          await gitPackage.setActivePaneItem({getPath: () => '/somewhere/else/on/disk'})
          expect(gitPackage.setActiveGitRepository).toHaveBeenCalledWith(atom.project.getRepositories()[0])

          gitPackage.setActiveGitRepository.reset()
          await gitPackage.setActivePaneItem({getPath: () => '/somewhere/else/else/on/disk'})
          expect(gitPackage.setActiveGitRepository).not.toHaveBeenCalled()
        })

        it('does not assign the active repository if there are no repositories in the project', async () => {
          atom.project.setPaths([])
          await gitPackage.setActivePaneItem({getPath: () => '/somewhere/on/disk'})
          expect(gitPackage.setActiveGitRepository).not.toHaveBeenCalled()
        })
      })
    })

    describe('when the active pane item is set to an item with no getPath method', () => {
      it('assigns the active repository based on the first repository in the project unless an active repository already exists', async () => {
        const repoPath1 = copyRepository('test-repo')
        const repoPath2 = copyRepository('dummy-atom')
        atom.project.setPaths([repoPath1, repoPath2])
        await gitPackage.setActivePaneItem({})
        expect(gitPackage.setActiveGitRepository).toHaveBeenCalledWith(atom.project.getRepositories()[0])

        gitPackage.setActiveGitRepository.reset()
        await gitPackage.setActivePaneItem({})
        expect(gitPackage.setActiveGitRepository).not.toHaveBeenCalled()
      })

      it('does not assign the active repository if there are no repositories in the project', async () => {
        atom.project.setPaths([])
        await gitPackage.setActivePaneItem({})
        expect(gitPackage.setActiveGitRepository).not.toHaveBeenCalled()
      })
    })
  })

  describe('setActiveGitRepository', () => {
    ffit('updates the view model of all components to one backed by the given repository', async () => {
      const repo1 = GitRepository.open(copyRepository('test-repo'))
      const repo2 = GitRepository.open(copyRepository('dummy-atom'))

      await gitPackage.setActiveGitRepository(repo1)
      const gitStoreForRepo1 = gitPackage.fileListComponent.getViewModel().gitStore
      expect(await gitPackage.fileListComponent.getViewModel().gitStore.gitService.gitRepo).toBe(repo1.async)
      expect(await gitPackage.statusBarComponent.getViewModel().gitStore.gitService.gitRepo).toBe(repo1.async)

      await gitPackage.setActiveGitRepository(repo2)
      expect(await gitPackage.fileListComponent.getViewModel().gitStore.gitService.gitRepo).toBe(repo2.async)
      expect(await gitPackage.statusBarComponent.getViewModel().gitStore.gitService.gitRepo).toBe(repo2.async)

      // make sure we maintain a single git store per underlying repository
      await gitPackage.setActiveGitRepository(repo1)
      expect(gitPackage.fileListComponent.getViewModel().gitStore).toBe(gitStoreForRepo1)
      expect(gitPackage.statusBarComponent.getViewModel().gitStore).toBe(gitStoreForRepo1)
    })

    it('destroys git-dependent components if the active repository is null', () => {

    })
  })

  xit('closes open diffs of files that were committed', async () => {
    jasmine.useRealClock()

    repo = copyRepository()
    atom.project.setPaths([repo])

    fs.writeFileSync(path.join(repo, 'README.md'), 'hey diddle diddle')

    await gitPackage.update()
    await atom.workspace.open('README.md')
    await gitPackage.openDiffForActiveEditor()

    const paneItem = atom.workspace.getActivePaneItem()
    expect(paneItem instanceof DiffViewModel).toBe(true)

    commit(gitPackage.getFileListViewModel(), 'hey')
    waitsFor('the pane item to close', () => {
      const paneItem = atom.workspace.getActivePaneItem()
      return !(paneItem instanceof DiffViewModel)
    })
  })
})
