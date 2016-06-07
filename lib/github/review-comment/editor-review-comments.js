'use babel'

import {Range, CompositeDisposable} from 'atom'
import {diffLines} from 'diff'
import MarkerIndex from 'marker-index'

export default class EditorReviewComments {
  constructor (editor) {
    this.editor = editor
    this.outdatedCommentsByCommitId = new Map()
    this.bufferContentsByCommitId = new Map()
  }

  add (commitId, bufferContents, commentsById) {
    const index = new MarkerIndex()
    for (let [id, comment] of commentsById) {
      index.insert(id, {row: comment.row, column: 0}, {row: comment.row + 1, column: 0})
      index.setExclusive(id, true)
    }

    let currentRow = 0
    for (let change of diffLines(bufferContents, this.editor.getText())) {
      if (change.added) {
        const {inside} = index.splice({row: currentRow, column: 0}, {row: 0, column: 0}, {row: change.count, column: 0})
        for (let id of inside) {
          this.markAsOutdated(commitId, bufferContents, id, commentsById.get(id))
          index.delete(id)
        }

        currentRow += change.count
      } else if (change.removed) {
        const {inside} = index.splice({row: currentRow, column: 0}, {row: change.count, column: 0}, {row: 0, column: 0})
        for (let id of inside) {
          this.markAsOutdated(commitId, bufferContents, id, commentsById.get(id))
          index.delete(id)
        }
      } else {
        currentRow += change.count
      }
    }

    let rangesByCommentId = index.dump()
    for (let _id of Object.keys(rangesByCommentId)) {
      const id = parseInt(_id)
      const comment = commentsById.get(id)
      const range = Range.fromObject(rangesByCommentId[id])
      const marker = this.editor.markBufferRange(range, {reversed: true, invalidate: 'inside'})
      const subscription = marker.onDidChange(({isValid}) => {
        if (!isValid) {
          this.markAsOutdated(commitId, bufferContents, id, comment)
          marker.destroy()
          subscription.dispose()
        }
      })
      this.editor.decorateMarker(marker, {type: 'block', position: 'after', item: comment.item})
    }
  }

  markAsOutdated (commitId, bufferContents, id, comment) {
    if (!this.bufferContentsByCommitId.has(commitId)) {
      this.bufferContentsByCommitId.set(commitId, bufferContents)
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
}
