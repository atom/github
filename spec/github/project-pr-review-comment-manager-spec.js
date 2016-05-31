'use babel'

import ProjectPrReviewCommentManager from '../../lib/github/review-comment/project-pr-review-comment-manager'

import path from 'path'

describe('ProjectPrReviewCommentManager', () => {
  const testRepoPath = path.join(__dirname, '..', 'fixtures', 'test-repo')
  const dummyAtomPath = path.join(__dirname, '..', 'fixtures', 'dummy-atom')
  let gitHubModel

  beforeEach(() => {
    gitHubModel = {
      async getBufferComments () {
        return []
      },
      getPullRequestForCurrentBranch () {
        return { url: 'https://api.github.com/repos/atom/test-repo/pulls/1' }
      }
    }
    atom.project.getPaths().forEach(p => atom.project.removePath(p))
  })

  it('creates a new PrReviewCommentManager per project path', () => {
    atom.project.addPath(testRepoPath)
    atom.project.addPath(dummyAtomPath)
    const projectManager = new ProjectPrReviewCommentManager(atom.project, gitHubModel)
    expect(projectManager.getPrReviewCommentManagers().map(m => m.getRootPath())).toEqual([
      testRepoPath, dummyAtomPath
    ])
  })

  it('destroys PrReviewCommentManagers when paths are removed', () => {
    atom.project.addPath(testRepoPath)
    atom.project.addPath(dummyAtomPath)
    const projectManager = new ProjectPrReviewCommentManager(atom.project, gitHubModel)
    atom.project.removePath(testRepoPath)
    expect(projectManager.getPrReviewCommentManagers().map(m => m.getRootPath())).toEqual([
      dummyAtomPath
    ])
  })

  it('creates new PrReviewCommentManagers when new paths are added', () => {
    atom.project.addPath(testRepoPath)
    const projectManager = new ProjectPrReviewCommentManager(atom.project, gitHubModel)
    atom.project.addPath(dummyAtomPath)
    expect(projectManager.getPrReviewCommentManagers().map(m => m.getRootPath())).toEqual([
      testRepoPath, dummyAtomPath
    ])
  })
})
