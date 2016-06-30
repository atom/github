/** @babel */
/** @jsx etch.dom */

import {Emitter, CompositeDisposable} from 'atom'
import etch from 'etch'

import HunkView from './hunk-view'

const EMPTY_SET = new Set()

export default class FilePatchView {
  constructor ({filePatch, repository, stagingStatus, registerHunkView}) {
    this.filePatch = filePatch
    this.repository = repository
    this.filePatchSubscriptions = new CompositeDisposable(
      this.filePatch.onDidUpdate(this.didUpdateFilePatch.bind(this)),
      this.filePatch.onDidDestroy(this.didDestroyFilePatch.bind(this))
    )
    this.stagingStatus = stagingStatus
    this.selectedHunk = filePatch.getHunks()[0]
    this.selectedLines = this.selectedHunk ? new Set([this.getFirstNonContextLine(this.selectedHunk)]) : null
    this.registerHunkView = registerHunkView
    this.emitter = new Emitter()
    this.selectionMode = 'hunk'
    etch.initialize(this)
    this.subscriptions = atom.commands.add(this.element, {
      'git:toggle-patch-selection-mode': this.togglePatchSelectionMode.bind(this),
      'git:focus-next-hunk': this.focusNextHunk.bind(this)
    })
  }

  focusNextHunk () {
    const hunks = this.filePatch.getHunks()
    let index = hunks.indexOf(this.selectedHunk)
    this.selectedHunk = ++index < hunks.length ? hunks[index] : hunks[0]
    const selectedLinesArr = this.selectionMode === 'hunk' ? this.selectedHunk.getLines() : [this.getFirstNonContextLine(this.selectedHunk)]
    this.selectedLines = new Set(selectedLinesArr)
    return etch.update(this)
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
    this.selectedHunk = filePatch.getHunks()[0]
    this.selectedLines = this.selectedHunk ? new Set([this.getFirstNonContextLine(this.selectedHunk)]) : null
    this.emitter.emit('did-change-title', this.getTitle())
    return etch.update(this)
  }

  destroy () {
    this.emitter.emit('did-destroy')
    this.subscriptions.dispose()
    return etch.destroy(this)
  }

  render () {
    let stageButtonLabelPrefix = this.stagingStatus === 'unstaged' ? 'Stage' : 'Unstage'
    return (
      <div className='git-FilePatchView' tabIndex='-1'>{this.filePatch.getHunks().map((hunk) => {
        const isSelected = hunk === this.selectedHunk
        const selectedLines = (isSelected && this.selectedLines != null) ? this.selectedLines : EMPTY_SET
        return (
          <HunkView
            hunk={hunk}
            isSelected={isSelected}
            selectedLines={selectedLines}
            didSelectLines={(lines) => this.didSelectLinesForHunk(hunk, lines)}
            didClickStageButton={() => this.didClickStageButtonForHunk(hunk)}
            stageButtonLabelPrefix={stageButtonLabelPrefix}
            registerView={this.registerHunkView} />
        )
      })}
      </div>
    )
  }

  getFirstNonContextLine (hunk) {
    const lines = hunk.getLines()
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const status = line.getStatus()
      if (status === 'added' || status === 'removed') {
        return line
      }
    }
  }

  togglePatchSelectionMode () {
    if (this.selectionMode === 'hunk') {
      this.selectionMode = 'hunkLine'
      this.selectedLines = new Set([this.getFirstNonContextLine(this.selectedHunk)])
    } else {
      this.selectionMode = 'hunk'
      this.selectedLines = new Set(this.selectedHunk.getLines())
    }
    return etch.update(this)
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
    this.selectedHunk = hunk
    this.selectedLines = this.selectionMode === 'hunk' ? new Set(hunk.getLines()) : selectedLines
    etch.update(this)
  }

  didClickStageButtonForHunk (hunk) {
    // TODO: Test the behavior of this line, which ensure we only attempt to
    // stage the selected lines if we clicked the stage button on the hunk
    // containing them.
    const clickedSelectedHunk = hunk === this.selectedHunk

    let patchToApply
    if (this.stagingStatus === 'unstaged') {
      if (this.selectedLines && clickedSelectedHunk) {
        patchToApply = this.filePatch.getStagePatchForLines(this.selectedLines)
        this.selectedLines = null
      } else {
        patchToApply = this.filePatch.getStagePatchForHunk(hunk)
      }
    } else if (this.stagingStatus === 'staged') {
      if (this.selectedLines && clickedSelectedHunk) {
        patchToApply = this.filePatch.getUnstagePatchForLines(this.selectedLines)
        this.selectedLines = null
      } else {
        patchToApply = this.filePatch.getUnstagePatchForHunk(hunk)
      }
    } else {
      throw new Error(`Unknown stagingStatus: ${this.stagingStatus}`)
    }

    return this.repository.applyPatchToIndex(patchToApply)
  }

  didUpdateFilePatch () {
    etch.update(this)
  }

  didDestroyFilePatch () {
    this.destroy()
  }
}
