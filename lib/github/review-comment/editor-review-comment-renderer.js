'use babel'

import {CompositeDisposable} from 'atom'

import ReviewCommentComponent from './review-comment-component'
import * as helpers from './helpers'

import compareSets from 'compare-sets'

const renderersByEditor = new WeakMap()

export default class EditorReviewCommentRenderer {
  static renderCommentsForEditor (comments, editor, positioner, gitHubModel) {
    let renderer = renderersByEditor.get(editor)
    if (!renderer) {
      renderer = new EditorReviewCommentRenderer(editor, positioner, gitHubModel)
      renderersByEditor.set(editor, renderer)
    }
    renderer.renderComments(comments)
  }

  static destroyRendererForEditor (editor) {
    const renderer = renderersByEditor.get(editor)
    if (renderer) { renderer.destroy() }
  }

  constructor (editor, positioner, gitHubModel) {
    this.editor = editor
    this.positioner = positioner
    this.gitHubModel = gitHubModel
    this.subscriptions = new CompositeDisposable()
    this.componentsByCommentId = new Map()
    this.commentsReceived = new Set()
    const [projectPath, relativizePath] = atom.project.relativizePath(this.editor.getPath())
    this.projectPath = projectPath
    this.relativizePath = relativizePath

    this.subscriptions.add(
      this.positioner.onDidInvalidateComment(commentId => this.destroyComment(commentId)),
      this.positioner.onDidAddComment(({comment, marker}) => this.addComment(comment.id, comment, marker))
    )
  }

  renderComments (comments) {
    const fetchedCommentsById = helpers.getCommentsById(comments)

    const newCommentIds = new Set([...comments].map(c => c.id))

    const {added, retained, removed} = compareSets(this.commentsReceived, newCommentIds)

    this.addComments(added, fetchedCommentsById)
    added.forEach(id => this.commentsReceived.add(id))

    retained.forEach(commentId => {
      this.updateComment(commentId, fetchedCommentsById.get(commentId))
    })

    removed.forEach(commentId => {
      this.destroyComment(commentId)
    })
  }

  // MKT says watch out for race conditions due to this now being async
  async addComments (addedIdSet, fetchedCommentsById) {
    const addedCommentsByCommitId = helpers.groupCommentsByOriginalCommitId(addedIdSet, fetchedCommentsById)
    addedCommentsByCommitId.forEach(async (comments, commitId) => {
      const diffStr = await this.gitHubModel.getDiff(commitId)
      const commentsWithRow = helpers.addRowForComments(comments, diffStr)
      const fileContents = await helpers.getFileForCommitId(commitId, this.projectPath, this.relativizePath)
      this.positioner.add(commitId, fileContents, commentsWithRow)
    })
  }

  addComment (commentId, comment, marker) {
    if (this.componentsByCommentId.get(commentId)) {
      throw new Error(`Comment #${commentId} is already added`)
    }
    const component = new ReviewCommentComponent({comment})
    this.componentsByCommentId.set(commentId, component)
    this.editor.decorateMarker(marker, {type: 'block', position: 'after', item: component.element})
  }

  updateComment (commentId, comment) {
    if (this.componentsByCommentId.has(commentId)) {
      const component = this.componentsByCommentId.get(comment.id)
      return component.update({comment})
    }
  }

  destroyComment (commentId) {
    if (this.componentsByCommentId.has(commentId)) {
      const component = this.componentsByCommentId.get(commentId)
      component.destroy(false)
      this.componentsByCommentId.delete(commentId)
    }
  }

  destroy () {
    this.subscriptions.dispose()
    this.componentsByCommentId.forEach((_value, commentId) => this.destroyComment(commentId))
  }
}
