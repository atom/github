'use babel'

import {Range, Point, Emitter, CompositeDisposable, Disposable} from 'atom'
import {diffLines} from 'diff'
import MarkerIndex from 'marker-index'

const positionersPerEditor = new WeakMap()
export default class EditorReviewCommentPositioner {
  static getForEditor (editor) {
    let positioner = positionersPerEditor.get(editor)
    if (!positioner) {
      positioner = new EditorReviewCommentPositioner(editor)
      positionersPerEditor.set(editor, positioner)
    }
    return positioner
  }

  constructor (editor) {
    this.editor = editor
    this.emitter = new Emitter()
    this.outdatedCommentsByCommitId = new Map()
    this.bufferContentsByCommitId = new Map()
    this.subscriptions = new CompositeDisposable()
    this.subscriptions.add(this.editor.onDidStopChanging(() => { this.refreshOutdated() }))
  }

  onDidAddComment (cb) {
    return this.emitter.on('did-add-comment', cb)
  }

  onDidInvalidateComment (cb) {
    return this.emitter.on('did-invalidate-comment', cb)
  }

  onDidUpdateCommentMarker (cb) {
    return this.emitter.on('did-update-comment-marker', cb)
  }

  createIndex (commitId, commitBufferContents, commentsById) {
    const index = new MarkerIndex()
    for (let [id, comment] of commentsById) {
      if (typeof comment.row !== 'number') throw new Error()
      index.insert(id, {row: comment.row, column: 0}, {row: comment.row + 1, column: 0})
      index.setExclusive(id, true)
    }

    let currentRow = 0
    for (let change of diffLines(commitBufferContents, this.editor.getText())) {
      if (change.added) {
        const {inside} = index.splice({row: currentRow, column: 0}, {row: 0, column: 0}, {row: change.count, column: 0})
        for (let id of inside) {
          this.markAsOutdated(commitId, commitBufferContents, id, commentsById.get(id))
          index.delete(id)
        }

        currentRow += change.count
      } else if (change.removed) {
        const {inside} = index.splice({row: currentRow, column: 0}, {row: change.count, column: 0}, {row: 0, column: 0})
        for (let id of inside) {
          this.markAsOutdated(commitId, commitBufferContents, id, commentsById.get(id))
          index.delete(id)
        }
      } else {
        currentRow += change.count
      }
    }
    return index
  }

  add (commitId, commitBufferContents, commentsById) {
    const index = this.createIndex(commitId, commitBufferContents, commentsById)

    let rangesByCommentId = index.dump()
    for (let _id of Object.keys(rangesByCommentId)) {
      const id = parseInt(_id)
      const comment = commentsById.get(id)
      const splitComment = comment.diff_hunk.split('\n')
      const commentLineText = splitComment[splitComment.length - 1].slice(1)
      const endOfText = commentLineText.length
      const range = Range.fromObject(rangesByCommentId[id])
      const markerRange = range.translate(new Point(0, 0), new Point(-1, endOfText))
      const marker = this.editor.markBufferRange(markerRange, {reversed: true, invalidate: 'touch'})

      const subscription = marker.onDidChange(({isValid, oldHeadBufferPosition, oldTailBufferPosition, newHeadBufferPosition, newTailBufferPosition}) => {
        if (!isValid) {
          for (let row = newHeadBufferPosition.row; row <= newTailBufferPosition.row; row++) {
            if (this.editor.lineTextForBufferRow(row) === commentLineText) {
              const newRange = new Range([row, 0], [row, endOfText])
              this.emitter.emit('did-update-comment-marker', {comment, range: newRange})
              marker.setBufferRange(newRange)
              return
            }
          }
          this.markAsOutdated(commitId, commitBufferContents, id, comment)
          marker.destroy()
          this.emitter.emit('did-invalidate-comment', id)
          subscription.dispose()
        }
      })
      this.subscriptions.add(
        subscription,
        new Disposable(() => marker.destroy())
      )
      this.emitter.emit('did-add-comment', {comment, range: markerRange})
    }
  }

  markAsOutdated (commitId, commitBufferContents, id, comment) {
    if (!this.bufferContentsByCommitId.has(commitId)) {
      this.bufferContentsByCommitId.set(commitId, commitBufferContents)
    }

    if (!this.outdatedCommentsByCommitId.has(commitId)) {
      this.outdatedCommentsByCommitId.set(commitId, new Map())
    }

    this.outdatedCommentsByCommitId.get(commitId).set(id, comment)
  }

  refreshOutdated () {
    let outdatedCommentsByCommitId = this.outdatedCommentsByCommitId
    this.outdatedCommentsByCommitId = new Map()
    for (let [commitId, commentsById] of outdatedCommentsByCommitId) {
      this.add(commitId, this.bufferContentsByCommitId.get(commitId), commentsById)
    }
  }

  destroy () {
    this.subscriptions.dispose()
    this.emitter.dispose()
  }
}
