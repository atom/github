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
    this.markerAndComponentByCommentId = new Map()
    const [projectPath, relativizedPath] = atom.project.relativizePath(this.editor.getPath())
    this.projectPath = projectPath
    this.relativizedPath = relativizedPath

    this.subscriptions.add(
      this.positioner.onDidInvalidateComment(commentId => this.destroyComment(commentId)),
      this.positioner.onDidAddComment(({comment, range}) => this.addComment(comment.id, comment, range))
    )
  }

  renderComments (comments) {
    const fetchedCommentsById = helpers.getCommentsById(comments)

    const oldCommentIds = new Set([...this.markerAndComponentByCommentId.keys()])
    const newCommentIds = new Set([...comments].map(c => c.id))

    const {added, retained, removed} = compareSets(oldCommentIds, newCommentIds)

    this.addComments(added, fetchedCommentsById)

    retained.forEach(commentId => {
      this.updateComment(commentId, fetchedCommentsById.get(commentId))
    })

    removed.forEach(commentId => {
      console.log('remove', commentId);
      this.destroyComment(commentId)
    })
  }

  async addComments (addedIdSet, fetchedCommentsById) {
    const addedCommentsByCommitId = helpers.groupCommentsByOriginalCommitId(addedIdSet, fetchedCommentsById)
    addedCommentsByCommitId.forEach(async (comments, commitId) => {
      const diffStr = await this.gitHubModel.getDiff(commitId)
      const commentsWithRow = helpers.addRowForComments(comments, diffStr)
      const fileContents = await helpers.getFileForCommitId(commitId, this.projectPath, this.relativizedPath)
      this.positioner.add(commitId, fileContents, commentsWithRow)
    })
  }

  addComment (commentId, comment, range) {
    if (this.markerAndComponentByCommentId.get(commentId)) {
      throw new Error(`Comment #${commentId} is already added`)
    }
    const component = new ReviewCommentComponent({comment})
    const marker = this.editor.markBufferRange(range, {reversed: true, invalidate: 'inside'})
    this.markerAndComponentByCommentId.set(commentId, {marker, component})
    this.editor.decorateMarker(marker, {type: 'block', position: 'after', item: component.element})
  }

  updateComment (commentId, comment) {
    if (this.markerAndComponentByCommentId.has(commentId)) {
      const {component} = this.markerAndComponentByCommentId.get(comment.id)
      return component.update({comment})
    }
  }

  destroyComment (commentId) {
    console.log('*****', this.markerAndComponentByCommentId);
    if (this.markerAndComponentByCommentId.has(commentId)) {
      const {marker, component} = this.markerAndComponentByCommentId.get(commentId)
      marker.destroy()
      component.destroy(false)
      this.markerAndComponentByCommentId.delete(commentId)
    }
  }

  destroy () {
    this.subscriptions.dispose()
    this.markerAndComponentByCommentId.forEach((_value, commentId) => this.destroyComment(commentId))
  }
}
