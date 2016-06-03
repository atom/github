'use babel'

import {Range, CompositeDisposable} from 'atom'
import {diffLines} from 'diff'
import MarkerIndex from 'marker-index'

export default class EditorReviewComments {
  constructor (editor) {
    this.editor = editor
    this.outdatedCommentsByCommitId = new Map()
    this.bufferContentsByCommitId = new Map()
    this.subscriptions = new CompositeDisposable()
  }

  destroy () {
    this.subscriptions.dispose()
  }

  add (commitId, bufferContents, rowsByCommentId) {
    let index = new MarkerIndex()
    for (let [id, row] of rowsByCommentId) {
      index.insert(id, {row: row, column: 0}, {row: row + 1, column: 0})
      index.setExclusive(id, true)
    }

    let currentRow = 0
    for (let change of diffLines(bufferContents, this.editor.getText())) {
      if (change.added) {
        let {inside} = index.splice({row: currentRow, column: 0}, {row: 0, column: 0}, {row: change.count, column: 0})
        for (let id of inside) {
          this.markAsOutdated(commitId, bufferContents, id, rowsByCommentId.get(id))
          index.delete(id)
        }

        currentRow += change.count
      } else if (change.removed) {
        let {inside} = index.splice({row: currentRow, column: 0}, {row: change.count, column: 0}, {row: 0, column: 0})
        for (let id of inside) {
          this.markAsOutdated(commitId, bufferContents, id, rowsByCommentId.get(id))
          index.delete(id)
        }
      } else {
        currentRow += change.count
      }
    }

    let rangesByCommentId = index.dump()
    for (let _id of Object.keys(rangesByCommentId)) {
      let id = parseInt(_id)
      let range = Range.fromObject(rangesByCommentId[id])
      let marker = this.editor.markBufferRange(range, {reversed: true, invalidate: 'inside'})
      let subscription = marker.onDidChange(({isValid}) => {
        if (!isValid) {
          this.markAsOutdated(commitId, bufferContents, id, rowsByCommentId.get(id))
          marker.destroy()
          subscription.dispose()
        }
      })
      this.editor.decorateMarker(marker, {type: 'block', position: 'after'})
    }
  }

  markAsOutdated (commitId, bufferContents, id, row) {
    if (!this.bufferContentsByCommitId.has(commitId)) {
      this.bufferContentsByCommitId.set(commitId, bufferContents)
    }

    if (!this.outdatedCommentsByCommitId.has(commitId)) {
      this.outdatedCommentsByCommitId.set(commitId, new Map())
    }

    this.outdatedCommentsByCommitId.get(commitId).set(id, row)
  }

  refreshOutdated () {
    let outdatedCommentsByCommitId = this.outdatedCommentsByCommitId
    this.outdatedCommentsByCommitId = new Map()
    for (let [commitId, rowsByCommentId] of outdatedCommentsByCommitId) {
      this.add(commitId, this.bufferContentsByCommitId.get(commitId), rowsByCommentId)
    }
  }
}
