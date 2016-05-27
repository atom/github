'use babel'

import ReviewCommentComponent from './review-comment-component'

import compareSets from 'compare-sets'

const renderersByEditor = new WeakMap()

export default class EditorReviewCommentRenderer {
  static renderCommentsForEditor (comments, editor) {
    let renderer = renderersByEditor.get(editor)
    if (!renderer) {
      renderer = new EditorReviewCommentRenderer(editor)
      renderersByEditor.set(editor, renderer)
    }
    renderer.renderComments(comments)
  }

  static destroyRendererForEditor (editor) {
    const renderer = renderersByEditor.get(editor)
    if (renderer) { renderer.destroy() }
  }

  constructor (editor) {
    this.editor = editor
    this.markerAndComponentByCommentId = new Map()
  }

  renderComments (comments) {
    const oldCommentIds = new Set([...this.markerAndComponentByCommentId.keys()])
    const newCommentIds = new Set([...comments].map(c => c.id))

    const {added, retained, removed} = compareSets(oldCommentIds, newCommentIds)

    comments.forEach(comment => {
      if (added.has(comment.id)) this.addComment(comment.id, comment)
      if (retained.has(comment.id)) this.updateComment(comment.id, comment)
    })
    removed.forEach(commentId => {
      this.destroyComment(commentId)
    })
  }

  addComment (commentId, comment) {
    if (this.markerAndComponentByCommentId.get(commentId)) {
      throw new Error(`Comment #${commentId} is already added`)
    }
    const component = new ReviewCommentComponent({comment})
    const marker = this.editor.markBufferPosition([comment.position - 1, 0])
    this.markerAndComponentByCommentId.set(commentId, {marker, component})
    this.editor.decorateMarker(marker, {type: 'block', position: 'after', item: component.element})
  }

  updateComment (commentId, comment) {
    const {component} = this.markerAndComponentByCommentId.get(comment.id)
    return component.update({comment})
  }

  destroyComment (commentId) {
    const {marker, component} = this.markerAndComponentByCommentId.get(commentId)
    marker.destroy()
    component.destroy(false)
    this.markerAndComponentByCommentId.delete(commentId)
  }

  destroy () {
    this.markerAndComponentByCommentId.forEach((_value, commentId) => this.destroyComment(commentId))
  }
}
