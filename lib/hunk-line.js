/* @flow */

import type DiffHunk from './diff-hunk'

export default class HunkLine {
  content: string;
  lineOrigin: string;
  oldLineNumber: ?number;
  newLineNumber: ?number;
  staged: boolean;
  hunk: DiffHunk;

  constructor (options: {content?: string, lineOrigin?: string, staged?: boolean, oldLineNumber?: number, newLineNumber?: number} = {}) {
    let {content, lineOrigin, staged, oldLineNumber, newLineNumber} = options
    this.staged = staged || false
    this.content = content || ''
    this.lineOrigin = lineOrigin || ' '
    this.oldLineNumber = oldLineNumber
    this.newLineNumber = newLineNumber
  }

  getContent (): string { return this.content }

  getLineOrigin (): string { return this.lineOrigin }

  getOldLineNumber (): ?number { return this.oldLineNumber }

  getNewLineNumber (): ?number { return this.newLineNumber }

  stage () { this.setIsStaged(true) }

  unstage () { this.setIsStaged(false) }

  setIsStaged (isStaged: boolean) {
    this.staged = isStaged
  }

  isStagable (): boolean { return this.isChanged() }

  isStaged (): boolean { return this.staged }

  isAddition (): boolean { return this.lineOrigin === '+' }

  isDeletion (): boolean { return this.lineOrigin === '-' }

  isContext (): boolean { return !this.isChanged() }

  isChanged (): boolean { return this.isAddition() || this.isDeletion() }

  isRemovedNewlineAtEOF (): boolean { return this.lineOrigin === '<' }

  isAddedNewlineAtEOF (): boolean { return this.lineOrigin === '>' }

  isContextNewlineAtEOF (): boolean { return this.lineOrigin === '=' }

  toString (): string {
    const oldLine = this.getOldLineNumber() || '---'
    const newLine = this.getNewLineNumber() || '---'
    const staged = this.isStaged() ? '✓' : ' '
    return `${staged} ${oldLine} ${newLine} ${this.getLineOrigin() || ' '} ${this.getContent()}`
  }

  fromGitObject ({line, isStaged, hunk}: {line: Object, isStaged: boolean, hunk: DiffHunk}) {
    if (!line) return

    this.hunk = hunk

    this.content = line.content().split(/[\r\n]/g)[0] // srsly.
    this.lineOrigin = String.fromCharCode(line.origin())

    this.oldLineNumber = null
    this.newLineNumber = null
    if (line.oldLineno() > 0) this.oldLineNumber = line.oldLineno()
    if (line.newLineno() > 0) this.newLineNumber = line.newLineno()

    if (this.isStagable()) {
      this.staged = isStaged
    } else {
      this.staged = false
    }
  }

  static fromGitObject (obj): HunkLine {
    const hunkLine = new HunkLine()
    hunkLine.fromGitObject(obj)
    return hunkLine
  }
}
