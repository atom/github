/* @flow */
/** @jsx etch.dom */

import etch from 'etch'

import type {Position} from './diff-selection'
import type HunkLine from './hunk-line'
import type {EtchElement} from './common'

export default class HunkLineComponent {
  hunkLine: HunkLine;
  selected: boolean;
  fileIndex: number;
  hunkIndex: number;
  lineIndex: number;
  element: EtchElement<HunkLineComponent>;

  constructor ({hunkLine, fileIndex, hunkIndex, lineIndex, selected}: {hunkLine: HunkLine, fileIndex: number, hunkIndex: number, lineIndex: number, selected: boolean}) {
    this.hunkLine = hunkLine
    this.selected = selected

    this.fileIndex = fileIndex
    this.hunkIndex = hunkIndex
    this.lineIndex = lineIndex

    let update = () => etch.updateElement(this)
    this.hunkLine.onDidChange(update)

    etch.createElement(this)
    this.element.component = this
  }

  getPosition (): Position {
    return [this.fileIndex, this.hunkIndex, this.lineIndex]
  }

  render () {
    let additionOrDeletion = ''
    if (this.hunkLine.isAddition()) {
      additionOrDeletion = 'addition'
    } else if (this.hunkLine.isDeletion()) {
      additionOrDeletion = 'deletion'
    }

    let selected = this.selected ? 'selected' : ''
    let staged = this.hunkLine.isStaged() ? 'staged' : ''

    return (
      <div className={`git-hunk-line ${additionOrDeletion} ${selected} ${staged}`}>
        <div className='old-line-number'>
          {this.hunkLine.getOldLineNumber() || ''}
        </div>
        <div className='new-line-number'>
          {this.hunkLine.getNewLineNumber() || ''}
        </div>
        <div className='diff-hunk-data'>
          {this.hunkLine.getLineOrigin()}
          {this.hunkLine.getContent()}
        </div>
      </div>
    )
  }
}
