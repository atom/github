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
    this.markersByCommentId = new Map()
    this.subscriptions = new CompositeDisposable()
    this.subscriptions.add(this.editor.onDidStopChanging(() => { this.refreshOutdated() }))
  }

  onDidAddComment (cb) {
    return this.emitter.on('did-add-comment', cb)
  }

  onDidInvalidateComment (cb) {
    return this.emitter.on('did-invalidate-comment', cb)
  }

  add (commitId, commitBufferContents, commentsById) {
    let ranges = this.translateCommentRanges(commitId, commitBufferContents, commentsById)

    for (let {id} of ranges.invalid) {
      this.markAsOutdated(commitId, commitBufferContents, id, commentsById.get(id))
      if (this.markersByCommentId.has(id)) {
        this.markersByCommentId.get(id).destroy()
        this.markersByCommentId.delete(id)
        this.emitter.emit('did-invalidate-comment', id)
      }
    }

    for (let {id, range} of ranges.valid) {
      const comment = commentsById.get(id)
      if (this.markersByCommentId.has(id)) {
        const marker = this.markersByCommentId.get(id)
        marker.bufferMarker.update(new Range(), {range, valid: true})
      } else {
        const marker = this.editor.markBufferRange(range, {reversed: true, invalidate: 'touch'})
        const subscription = marker.onDidChange((markerEvent) => {
          if (!markerEvent.isValid) {
            this.markAsOutdated(commitId, commitBufferContents, id, comment)
          }
        })
        this.subscriptions.add(
          subscription,
          new Disposable(() => marker.destroy())
        )
        this.emitter.emit('did-add-comment', {comment, marker})
        this.markersByCommentId.set(id, marker)
      }
    }
  }

  translateCommentRanges (commitId, commitBufferContents, commentsById) {
    const index = new MarkerIndex()
    for (let [id, comment] of commentsById) {
      if (typeof comment.row !== 'number') throw new Error()
      index.insert(id, {row: comment.row, column: 0}, {row: comment.row + 1, column: 0})
      index.setExclusive(id, true)
    }

    let invalidIds = new Set()
    let currentRow = 0
    for (let change of diffLines(commitBufferContents, this.editor.getText())) {
      if (change.added) {
        const {inside} = index.splice({row: currentRow, column: 0}, {row: 0, column: 0}, {row: change.count, column: 0})
        for (let id of inside) { invalidIds.add(id) }

        currentRow += change.count
      } else if (change.removed) {
        const {inside} = index.splice({row: currentRow, column: 0}, {row: change.count, column: 0}, {row: 0, column: 0})
        for (let id of inside) { invalidIds.add(id) }
      } else {
        currentRow += change.count
      }
    }

    const result = {invalid: [], valid: []}
    const rangesById = index.dump()
    for (let _id of Object.keys(rangesById)) {
      const id = parseInt(_id)
      const range = Range.fromObject(rangesById[id])
      const comment = {id, range}
      if (invalidIds.has(id)) {
        result.invalid.push(comment)
      } else {
        result.valid.push(comment)
      }
    }

    return result
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
