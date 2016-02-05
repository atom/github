/** @babel */

import {Emitter, CompositeDisposable} from 'atom'
import HunkLine from './hunk-line'
import EventTransactor from './event-transactor'

// DiffHunk contains diff information for a single hunk within a single file. It
// holds a list of HunkLine objects.
export default class DiffHunk {
  constructor (options) {
    this.emitter = new Emitter()
    this.transactor = new EventTransactor(this.emitter)
    this.setLines([])
  }

  onDidChange (callback) {
    return this.emitter.on('did-change', callback)
  }

  didChange () {
    this.transactor.didChange()
  }

  getHeader () { return this.header }

  setHeader (header) {
    this.header = header
    this.didChange()
  }

  getLines () { return this.lines }

  setLines (lines) {
    if (this.lineSubscriptions) {
      this.lineSubscriptions.dispose()
    }
    this.lineSubscriptions = new CompositeDisposable()
    this.lines = lines

    for (const line of lines) {
      this.lineSubscriptions.add(line.onDidChange(this.didChange.bind(this)))
    }
    this.didChange()
  }

  getFirstChangedLine () {
    for (const line of this.lines) {
      if (line.isChanged()) return line
    }
    return null
  }

  stage () {
    this.transactor.transact(() => {
      for (let line of this.lines)
        line.stage()
    })
  }

  unstage () {
    this.transactor.transact(() => {
      for (let line of this.lines)
        line.unstage()
    })
  }

  // Returns {String} one of 'staged', 'unstaged', 'partial'
  getStageStatus () {
    let hasStaged = false
    let hasUnstaged = false
    for (let line of this.lines) {
      if (!line.isStagable()) continue

      if (line.isStaged()) {
        hasStaged = true
      } else {
        hasUnstaged = true
      }
    }

    if (hasStaged && hasUnstaged) {
      return 'partial'
    } else if (hasStaged) {
      return 'staged'
    }

    return 'unstaged'
  }

  toString () {
    const lines = this.lines.map((line) => { return line.toString() }).join('\n')
    return `HUNK ${this.getHeader()}\n${lines}`
  }

  fromString (hunkStr) {
    let linesStr = hunkStr.trim().split('\n')
    let metadata = /HUNK (.+)/.exec(linesStr[0])
    if (!metadata) return null

    let [, header] = metadata
    let lines = []
    for (let i = 1; i < linesStr.length; i++) {
      if (!linesStr[i].trim()) continue
      let line = HunkLine.fromString(linesStr[i])
      lines.push(line)
    }

    this.transactor.transact(() => {
      this.setHeader(header)
      this.setLines(lines)
    })
  }

  static fromString (hunkStr) {
    let diffHunk = new DiffHunk()
    diffHunk.fromString(hunkStr)
    return diffHunk
  }

  async fromGitUtilsObject ({hunk, isStaged, fileName, stageFn}) {
    if (!hunk) return

    let lines = []
    for (let line of (await hunk.lines())) {
      let hunkLine = HunkLine.fromGitUtilsObject({line, fileName, stageFn})
      await hunkLine.setIsStaged(isStaged)
      lines.push(hunkLine)
    }

    this.transactor.transact(() => {
      this.setHeader(hunk.header())
      this.setLines(lines)
    })
  }
}
