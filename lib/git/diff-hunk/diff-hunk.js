/* @flow */

import HunkLine from '../diff-hunk-line/hunk-line'

import type FileDiff from '../file-diff/file-diff'
import type {ConvenientHunk} from 'nodegit'

export type StageStatus = 'staged' | 'unstaged' | 'partial'

// DiffHunk contains diff information for a single hunk within a single file. It
// holds a list of HunkLine objects.
export default class DiffHunk {
  lines: Array<HunkLine>;
  header: string;
  diff: FileDiff;

  constructor () {
    this.setLines([])
  }

  getHeader (): string { return this.header }

  setHeader (header: string) {
    this.header = header
  }

  getLines (): Array<HunkLine> { return this.lines }

  setLines (lines: Array<HunkLine>) {
    this.lines = lines
  }

  getFirstChangedLine (): ?HunkLine {
    for (const line of this.lines) {
      if (line.isChanged()) return line
    }
    return null
  }

  stage () {
    for (let line of this.lines) {
      line.stage()
    }
  }

  unstage () {
    for (let line of this.lines) {
      line.unstage()
    }
  }

  getStageStatus (): StageStatus {
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

  toString (): string {
    const lines = this.lines.map(line => line.toString()).join('\n')
    return `HUNK ${this.getHeader()}\n${lines}`
  }

  async fromGitObject ({hunk, isStaged, diff}: {hunk: ConvenientHunk, isStaged: boolean, diff: FileDiff}): Promise<void> {
    if (!hunk) return

    let lines = []
    for (let line of (await hunk.lines())) {
      let hunkLine = HunkLine.fromGitObject({line, isStaged, hunk: this})
      lines.push(hunkLine)
    }

    this.diff = diff

    this.setHeader(hunk.header())
    this.setLines(lines)
  }
}
