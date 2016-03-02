/* @flow */

import {Emitter, CompositeDisposable} from 'atom'
import HunkLine from './hunk-line'
import EventTransactor from './event-transactor'

import type {Disposable} from 'atom'
import type FileDiff from './file-diff'
import type {ConvenientHunk} from 'nodegit'

export type StageStatus = 'staged' | 'unstaged' | 'partial'

// DiffHunk contains diff information for a single hunk within a single file. It
// holds a list of HunkLine objects.
export default class DiffHunk {
  emitter: Emitter;
  transactor: EventTransactor;
  lineSubscriptions: CompositeDisposable;
  isSyncing: boolean;

  lines: Array<HunkLine>;
  header: string;
  diff: FileDiff;

  constructor () {
    this.emitter = new Emitter()
    this.transactor = new EventTransactor(this.emitter, {hunk: this})
    this.setLines([])
  }

  onDidChange (callback: Function): Disposable {
    return this.emitter.on('did-change', callback)
  }

  didChange (event: ?Object) {
    this.transactor.didChange(event)
  }

  getHeader (): string { return this.header }

  setHeader (header: string) {
    this.header = header
    this.didChange()
  }

  getLines (): Array<HunkLine> { return this.lines }

  setLines (lines: Array<HunkLine>) {
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

  getFirstChangedLine (): ?HunkLine {
    for (const line of this.lines) {
      if (line.isChanged()) return line
    }
    return null
  }

  stage () {
    this.transactor.transact(() => {
      for (let line of this.lines) {
        line.stage()
      }
    })
  }

  unstage () {
    this.transactor.transact(() => {
      for (let line of this.lines) {
        line.unstage()
      }
    })
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

  isSyncingState (): boolean {
    return !!this.isSyncing
  }

  syncState (fn: Function) {
    this.isSyncing = true
    fn()
    this.isSyncing = false
  }

  toString (): string {
    const lines = this.lines.map((line) => { return line.toString() }).join('\n')
    return `HUNK ${this.getHeader()}\n${lines}`
  }

  fromString (hunkStr: string) {
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

    this.syncState(() => {
      this.transactor.transact(() => {
        this.setHeader(header)
        this.setLines(lines)
      })
    })
  }

  static fromString (hunkStr): DiffHunk {
    let diffHunk = new DiffHunk()
    diffHunk.fromString(hunkStr)
    return diffHunk
  }

  async fromGitUtilsObject ({hunk, isStaged, diff}: {hunk: ConvenientHunk, isStaged: boolean, diff: FileDiff}): Promise<void> {
    if (!hunk) return

    let lines = []
    for (let line of (await hunk.lines())) {
      let hunkLine = HunkLine.fromGitUtilsObject({line, isStaged, hunk: this})
      lines.push(hunkLine)
    }

    this.diff = diff

    this.syncState(() => {
      this.transactor.transact(() => {
        this.setHeader(hunk.header())
        this.setLines(lines)
      })
    })
  }
}
