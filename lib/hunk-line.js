/* @flow */

import {Emitter} from 'atom'

import type {Disposable} from 'atom'
import type DiffHunk from './diff-hunk'

export default class HunkLine {
  content: string;
  lineOrigin: string;
  oldLineNumber: ?number;
  newLineNumber: ?number;
  staged: boolean;
  emitter: Emitter;
  isSyncing: boolean;
  hunk: DiffHunk;

  constructor (options: {content?: string, lineOrigin?: string, staged?: boolean, oldLineNumber?: number, newLineNumber?: number} = {}) {
    this.emitter = new Emitter()

    let {content, lineOrigin, staged, oldLineNumber, newLineNumber} = options
    this.staged = staged || false
    this.content = content || ''
    this.lineOrigin = lineOrigin || ' '
    this.oldLineNumber = oldLineNumber
    this.newLineNumber = newLineNumber
  }

  onDidChange (callback: Function): Disposable {
    return this.emitter.on('did-change', callback)
  }

  getContent (): string { return this.content }

  getLineOrigin (): string { return this.lineOrigin }

  getOldLineNumber (): ?number { return this.oldLineNumber }

  getNewLineNumber (): ?number { return this.newLineNumber }

  stage () { this.setIsStaged(true) }

  unstage () { this.setIsStaged(false) }

  setIsStaged (isStaged: boolean) {
    if (this.isStagable()) {
      const previousValue = this.staged
      const newValue = isStaged
      if (previousValue !== newValue) {
        this.staged = isStaged
        this.emitChangeEvent({property: 'isStaged', line: this})
      }
    } else {
      return Promise.resolve()
    }
  }

  isStagable (): boolean { return this.isChanged() }

  isStaged (): boolean { return this.staged }

  isAddition (): boolean { return this.lineOrigin === '+' }

  isDeletion (): boolean { return this.lineOrigin === '-' }

  isContext (): boolean { return !this.isChanged() }

  isChanged (): boolean { return this.isAddition() || this.isDeletion() }

  emitChangeEvent (event: ?Object) {
    this.emitter.emit('did-change', event)
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
    const oldLine = this.getOldLineNumber() || '---'
    const newLine = this.getNewLineNumber() || '---'
    const staged = this.isStaged() ? '✓' : ' '
    return `${staged} ${oldLine} ${newLine} ${this.getLineOrigin() || ' '} ${this.getContent()}`
  }

  fromString (str: string) {
    let lineMatch = /([ ✓]) ([\d]+|---) ([\d]+|---)(?: ([ +-]) (.+))?$/.exec(str)
    if (!lineMatch) return null

    let [, staged, oldLine, newLine, lineOrigin, content] = lineMatch

    this.syncState(() => {
      this.content = content || ''
      this.lineOrigin = lineOrigin
      this.setIsStaged(staged === '✓')

      this.oldLineNumber = oldLine === '---' ? null : parseInt(oldLine, 10)
      this.newLineNumber = newLine === '---' ? null : parseInt(newLine, 10)

      this.emitChangeEvent()
    })
  }

  static fromString (str: string): HunkLine {
    const hunkLine = new HunkLine()
    hunkLine.fromString(str)
    return hunkLine
  }

  fromGitUtilsObject ({line, isStaged, hunk}: {line: Object, isStaged: boolean, hunk: DiffHunk}) {
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

    this.syncState(() => {
      this.emitChangeEvent()
    })
  }

  static fromGitUtilsObject (obj): HunkLine {
    const hunkLine = new HunkLine()
    hunkLine.fromGitUtilsObject(obj)
    return hunkLine
  }
}
