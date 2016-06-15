'use babel'

import compareSets from 'compare-sets'

import PrReviewCommentManager from './pr-review-comment-manager'

import {CompositeDisposable} from 'atom'

export default class ProjectPrReviewCommentManager {
  constructor (project, gitHubModel, commentEmitter) {
    this.subscriptions = new CompositeDisposable()

    this.gitHubModel = gitHubModel
    this.commentEmitter = commentEmitter
    this.prReviewCommentManagerPerProjectPath = new Map()
    this.currentPaths = new Set(project.getPaths())

    this.currentPaths.forEach(path => this.addPath(path))

    this.subscriptions.add(project.onDidChangePaths(this.handleDidChangeProjectPaths.bind(this)))
  }

  getPrReviewCommentManagers () {
    return [...this.prReviewCommentManagerPerProjectPath.values()]
  }

  handleDidChangeProjectPaths (paths) {
    const newPaths = new Set(paths)
    const {added, removed} = compareSets(this.currentPaths, newPaths)
    added.forEach(p => this.addPath(p))
    removed.forEach(p => this.removePath(p))
    this.currentPaths = newPaths
  }

  addPath (path) {
    const mgr = new PrReviewCommentManager(this.gitHubModel, path, this.commentEmitter)
    this.prReviewCommentManagerPerProjectPath.set(path, mgr)
  }

  removePath (path) {
    const manager = this.prReviewCommentManagerPerProjectPath.get(path)
    if (manager) {
      manager.destroy()
      this.prReviewCommentManagerPerProjectPath.delete(path)
    }
  }

  destroy () {
    this.subscriptions.dispose()
  }
}
