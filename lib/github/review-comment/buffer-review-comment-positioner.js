'use babel'

import {Range, Emitter} from 'atom'
import {diffLines} from 'diff'
import MarkerIndex from 'marker-index'

const positionersPerBuffer = new WeakMap()
export default class BufferReviewCommentPositioner {
  static getForBuffer (buffer) {
    let positioner = positionersPerBuffer.get(buffer)
    if (!positioner) {
      positioner = new BufferReviewCommentPositioner(buffer)
      positionersPerBuffer.set(buffer, positioner)
    }
    return positioner
  }

  constructor (buffer) {
    this.buffer = buffer
    this.emitter = new Emitter()
    this.outdatedCommentsByCommitId = new Map()
    this.bufferContentsByCommitId = new Map()
  }

  onDidAddComment (cb) {
    return this.emitter.on('did-add-comment', cb)
  }

  onDidInvalidateComment (cb) {
    return this.emitter.on('did-invalidate-comment', cb)
  }

  createIndex (commitId, commitBufferContents, commentsById) {
    const index = new MarkerIndex()
    for (let [id, comment] of commentsById) {
      index.insert(id, {row: comment.row, column: 0}, {row: comment.row + 1, column: 0})
      index.setExclusive(id, true)
    }

    let currentRow = 0
    for (let change of diffLines(commitBufferContents, this.buffer.getText())) {
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
      const range = Range.fromObject(rangesByCommentId[id])
      const marker = this.buffer.markRange(range, {reversed: true, invalidate: 'inside'})
      const subscription = marker.onDidChange(({isValid}) => {
        if (!isValid) {
          this.markAsOutdated(commitId, commitBufferContents, id, comment)
          marker.destroy()
          subscription.dispose()
          this.emitter.emit('did-invalidate-comment', id)
        }
      })
      this.emitter.emit('did-add-comment', {comment, range})
    }
  }

  markAsOutdated (commitId, commitBufferContents, id, comment) {
    console.log('comment', id, 'is invalidated')
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
    this.emitter.dispose()
  }
}
