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
    // TODO: Remove these 4 lines and actually test drive the corner cases
    // they solve: Clicking a hunk other than the one containing the selected
    // lines and staging the rest of a hunk after staging some of its lines.
    const selectedLines = this.selectedLines
    const clickedSelectedHunk = (hunk === this.selectedHunk)
    this.selectedLines = null
    this.selectedHunk = null

    if (this.stagingStatus === 'unstaged') {
      if (selectedLines && clickedSelectedHunk) {
        return this.repository.applyPatchToIndex(this.filePatch.getStagePatchForLines(selectedLines))
      } else {
        return this.repository.applyPatchToIndex(this.filePatch.getStagePatchForHunk(hunk))
      }
    } else if (this.stagingStatus === 'staged') {
      if (selectedLines && clickedSelectedHunk) {
        return this.repository.applyPatchToIndex(this.filePatch.getUnstagePatchForLines(selectedLines))
      } else {
        return this.repository.applyPatchToIndex(this.filePatch.getUnstagePatchForHunk(hunk))
      }
    } else {
      throw new Error(`Unknown stagingStatus: ${this.stagingStatus}`)
    }
  }

  didUpdateFilePatch () {
    etch.update(this)
  }

  didDestroyFilePatch () {
    this.destroy()
  }
}
