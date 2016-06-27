/** @babel */
/** @jsx etch.dom */

import {Emitter, CompositeDisposable} from 'atom'
import etch from 'etch'

import HunkComponent from './hunk-component'

const EMPTY_SET = new Set()

export default class FilePatchComponent {
  constructor ({filePatch, repository, stagingStatus, registerHunkComponent}) {
    this.filePatch = filePatch
    this.repository = repository
    this.filePatchSubscriptions = new CompositeDisposable(
      this.filePatch.onDidUpdate(this.didUpdateFilePatch.bind(this)),
      this.filePatch.onDidDestroy(this.didDestroyFilePatch.bind(this))
    )
    this.stagingStatus = stagingStatus
    this.selectedLines = EMPTY_SET
    this.selectedHunk = null
    this.registerHunkComponent = registerHunkComponent
    this.emitter = new Emitter()
    etch.initialize(this)
  }

  update ({filePatch, repository, stagingStatus}) {
    if (this.filePatchSubscriptions) this.filePatchSubscriptions.dispose()

    this.filePatch = filePatch
    this.filePatchSubscriptions = new CompositeDisposable(
      this.filePatch.onDidUpdate(this.didUpdateFilePatch.bind(this)),
      this.filePatch.onDidDestroy(this.didDestroyFilePatch.bind(this))
    )
    this.repository = repository
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
            didSelectLines={(lines) => this.didSelectLinesForHunk(hunk, lines)}
            didClickStageButton={() => this.didClickStageButtonForHunk(hunk)}
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

  didClickStageButtonForHunk (hunk) {
    return this.repository.applyPatchToIndex(this.filePatch.getStagePatchForHunk(hunk))
  }

  didUpdateFilePatch () {
    etch.update(this)
  }

  didDestroyFilePatch () {
    this.destroy()
  }
}
