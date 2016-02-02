/** @babel */

import {Emitter, CompositeDisposable} from 'atom'
import HunkLine from './hunk-line'

import _ from 'underscore-contrib'

// DiffHunk contains diff information for a single hunk within a single file. It
// holds a list of HunkLine objects.
export default class DiffHunk {
  constructor(options) {
    this.emitter = new Emitter()
    this.setLines([])
  }

  onDidChange(callback) {
    return this.emitter.on('did-change', callback)
  }

  emitChangeEvent() {
    this.emitter.emit('did-change')
  }

  getHeader() { return this.header }

  setHeader(header) {
    this.header = header
  }

  getLines() { return this.lines }

  setLines(lines) {
    if (this.lineSubscriptions)
      this.lineSubscriptions.dispose()
    this.lineSubscriptions = new CompositeDisposable
    this.lines = lines

    for (const line of lines) {
      this.lineSubscriptions.add(line.onDidChange(this.lineDidChange.bind(this, line)))
    }
  }

  stage() {
    this.transact(() => {
      for (let line of this.lines)
        line.stage()
    })
  }

  unstage() {
    this.transact(() => {
      for (let line of this.lines)
        line.unstage()
    })
  }

  transact(fn) {
    this.currentChangeTransactionLines = []
    fn()
    if (this.currentChangeTransactionLines.length)
      this.emitChangeEvent({lines: this.currentChangeTransactionLines})
    this.currentChangeTransactionLines = null
  }

  lineDidChange(line) {
    if (this.currentChangeTransactionLines)
      this.currentChangeTransactionLines.push(line)
    else
      this.emitChangeEvent({lines: [line]})
  }

  // Returns {String} one of 'staged', 'unstaged', 'partial'
  getStageStatus() {
    let hasStaged = false
    let hasUnstaged = false
    for (let line of this.lines) {
      if (!line.isStagable()) continue;

      if (line.isStaged())
        hasStaged = true
      else
        hasUnstaged = true
    }

    if (hasStaged && hasUnstaged)
      return 'partial'
    else if (hasStaged)
      return 'staged'
    return 'unstaged'
  }

  toString() {
    lines = this.lines.map((line) => { return line.toString() }).join('\n')
    return `HUNK ${this.getHeader()}\n${lines}`
  }

  static fromString(hunkStr) {
    let linesStr = hunkStr.trim().split('\n')
    let metadata = /HUNK (.+)/.exec(linesStr[0])
    if (!metadata) return null;

    let [__, header] = metadata
    let lines = []
    for (let i = 1; i < linesStr.length; i++) {
      if (!linesStr[i].trim()) continue
      let line = HunkLine.fromString(linesStr[i])
      lines.push(line)
    }

    let diffHunk = new DiffHunk()
    diffHunk.setHeader(header)
    diffHunk.setLines(lines)
    return diffHunk
  }

  async fromGitUtilsObject({hunk, stagedLines}) {
    if (!hunk) return;

    this.setHeader(hunk.header())

    let lines = []
    for (let line of (await hunk.lines())) {
      let hunkLine = new HunkLine()
      hunkLine.fromGitUtilsObject({line: line})
      const staged = Boolean(_.find(stagedLines, line => {
        // return line.getOldLineNumber() === hunkLine.getOldLineNumber() &&
        //        line.getNewLineNumber() === hunkLine.getNewLineNumber() &&
        //        line.getLineOrigin() === hunkLine.getLineOrigin()

        // FIXME: NOT GOOD
        return line.getContent() === hunkLine.getContent() &&
               line.getLineOrigin() === hunkLine.getLineOrigin()
      }))
      if (staged) {
        console.log('staged:')
        console.log(hunkLine.toString())
      }
      hunkLine.setIsStaged(staged)
      lines.push(hunkLine)
    }
    this.setLines(lines)
  }
}
