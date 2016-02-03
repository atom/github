/** @babel */

import HunkLine from './hunk-line'

import _ from 'underscore-contrib'

// DiffHunk contains diff information for a single hunk within a single file. It
// holds a list of HunkLine objects.
export default class DiffHunk {
  constructor(options) {
    this.lines = []
  }

  getHeader() { return this.header }

  getLines() { return this.lines }

  stage() {
    for (let line of this.lines)
      line.stage()
  }

  unstage() {
    for (let line of this.lines)
      line.unstage()
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
    diffHunk.header = header
    diffHunk.lines = lines
    return diffHunk
  }

  async fromGitUtilsObject({hunk, stagedLines, diff, stageFn}) {
    if (!hunk) return;

    this.header = hunk.header()

    for (let line of (await hunk.lines())) {
      let hunkLine = HunkLine.fromGitUtilsObject({line, diff, stageFn})
      const staged = Boolean(_.find(stagedLines, line => {
        return line.getOldLineNumber() === hunkLine.getOldLineNumber() &&
               line.getNewLineNumber() === hunkLine.getNewLineNumber() &&
               line.getLineOrigin() === hunkLine.getLineOrigin()
      }))
      if (staged) {
        console.log('staged:')
        console.log(hunkLine.getContent())
      }
      await hunkLine.setIsStaged(staged)
      this.lines.push(hunkLine)
    }
  }
}
