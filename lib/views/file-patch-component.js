/** @babel */
/** @jsx etch.dom */

import {Emitter} from 'atom'
import etch from 'etch'

import HunkComponent from './hunk-component'

const EMPTY_SET = new Set()

export default class FilePatchComponent {
  constructor ({filePatch, stagingStatus, registerHunkComponent}) {
    this.filePatch = filePatch
    this.filePatchSubscriptions = this.filePatch.onDidDestroy(this.destroy.bind(this))
    this.stagingStatus = stagingStatus
    this.selectedLines = EMPTY_SET
    this.selectedHunk = null
    this.registerHunkComponent = registerHunkComponent
    this.emitter = new Emitter()
    etch.initialize(this)
  }

  update ({filePatch, stagingStatus}) {
    if (this.filePatchSubscriptions) this.filePatchSubscriptions.dispose()

    this.filePatch = filePatch
    this.filePatchSubscriptions = this.filePatch.onDidDestroy(this.destroy.bind(this))
    this.stagingStatus = stagingStatus
    this.emitter.emit('did-change-title', this.getTitle())
    return etch.update(this)
  }

  destroy () {
    this.emitter.emit('did-destroy')
    return etch.destroy(this)
  }

  render () {
    let stageButtonLabelPrefix = this.stagingStatus === 'unstaged' ? 'Stage' : 'Unstage'
    return (
      <div class='git-FilePatchComponent'>{this.filePatch.getHunks().map((hunk) => {
        const isSelected = hunk === this.selectedHunk
        const selectedLines = isSelected ? this.selectedLines : EMPTY_SET
        return (
          <HunkComponent
            hunk={hunk}
            isSelected={isSelected}
            selectedLines={selectedLines}
            onDidSelectLines={(lines) => this.didSelectLinesForHunk(hunk, lines)}
            stageButtonLabelPrefix={stageButtonLabelPrefix}
            registerComponent={this.registerHunkComponent} />
        )
      })}
      </div>
    )
  }

  getTitle () {
    let title = this.stagingStatus === 'staged' ? 'Staged' : 'Unstaged'
    title += ' Changes: '
    title += this.filePatch.getDescriptionPath()
    return title
  }

  onDidChangeTitle (callback) {
    return this.emitter.on('did-change-title', callback)
  }

  onDidDestroy (callback) {
    return this.emitter.on('did-destroy', callback)
  }

  didSelectLinesForHunk (hunk, selectedLines) {
    this.selectedLines = selectedLines
    this.selectedHunk = hunk
    etch.update(this)
  }
}
