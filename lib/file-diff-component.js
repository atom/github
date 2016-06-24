/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

import HunkComponent from './hunk-component'

const EMPTY_SET = new Set

export default class FileDiffComponent {
  constructor ({fileDiff}) {
    this.fileDiff = fileDiff
    this.componentsByHunk = new WeakMap
    this.selectedLines = new Set
    this.selectedHunk = null
    etch.initialize(this)
  }

  didSelectLinesForHunk (hunk, selectedLines) {
    this.selectedLines = selectedLines
    this.selectedHunk = hunk
    etch.update(this)
  }

  update () { }

  render () {
    this.componentsByHunk = new WeakMap
    return (
      <div class='git-FileDiffComponent'>{this.fileDiff.getHunks().map((hunk) => {
        const isSelected = hunk === this.selectedHunk
        const selectedLines = isSelected ? this.selectedLines : EMPTY_SET
        const component =
          <HunkComponent
            hunk={hunk}
            isSelected={isSelected}
            selectedLines={selectedLines}
            onDidSelectLines={(lines) => this.didSelectLinesForHunk(hunk, lines)} />
        this.componentsByHunk.set(hunk, component)
        return component
      })}
      </div>
    )
  }

  componentForHunk (hunk) {
    return this.componentsByHunk.get(hunk).component
  }
}
