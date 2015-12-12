/** @babel */

import HunkLine from './hunk-line'

export default class DiffHunk {
  constructor(options) {
    this.lines = []
    this.updateFromGitUtilsObject(options || {})
  }

  async updateFromGitUtilsObject({hunk}) {
    if (!hunk) return;

    this.header = hunk.header()

    for (let line of (await hunk.lines())) {
      this.lines.push(new HunkLine({line: line}))
    }
  }

  getHeader() { return this.header }

  getLines() { return this.lines }

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
}
