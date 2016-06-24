/** @babel */
/** @jsx etch.dom */

import {Emitter} from 'atom'
import etch from 'etch'

import HunkComponent from './hunk-component'

const EMPTY_SET = new Set

export default class FilePatchComponent {
  constructor ({filePatch, registerHunkComponent}) {
    this.filePatch = filePatch
    this.selectedLines = new Set
    this.selectedHunk = null
    this.registerHunkComponent = registerHunkComponent
    this.emitter = new Emitter()
    etch.initialize(this)
  }

  update ({filePatch}) {
    this.filePatch = filePatch
    return etch.update(this)
  }

  destroy () {
    this.emitter.emit('did-destroy')
  }

  render () {
    this.componentsByHunk = new WeakMap
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
            registerComponent={this.registerHunkComponent} />
        )
      })}
      </div>
    )
  }

  getTitle () {
    return 'Diff'
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
