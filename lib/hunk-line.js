/** @babel */

import {Emitter, Range} from 'atom'

export default class HunkLine {
  constructor(options) {
    this.emitter = new Emitter()

    let content, lineOrigin, staged, oldLineNumber, newLineNumber = options || {}
    this.staged = staged
    this.content = content || ''
    this.thisOrigin = lineOrigin
    this.oldLineNumber = oldLineNumber
    this.newLineNumber = newLineNumber
  }

  onDidChange(callback) {
    return this.emitter.on('did-change', callback)
  }

  emitChangeEvent() {
    this.emitter.emit('did-change')
  }

  getContent() { return this.content }

  getLineOrigin() { return this.lineOrigin }

  getOldLineNumber() { return this.oldLineNumber }

  getNewLineNumber() { return this.newLineNumber }

  stage() { this.setIsStaged(true) }

  unstage() { this.setIsStaged(false) }

  setIsStaged(isStaged) {
    if (this.isStagable()){
      this.staged = isStaged
      this.emitChangeEvent()
    }
  }

  isStagable() {
    return this.isChanged()
  }

  isStaged() { return this.staged }

  isAddition() { return this.lineOrigin === '+' }

  isDeletion() { return this.lineOrigin === '-' }

  isContext() { return !this.isChanged() }

  isChanged() { return this.isAddition() || this.isDeletion() }

  toString() {
    oldLine = this.getOldLineNumber() || '---'
    newLine = this.getNewLineNumber() || '---'
    staged = this.isStaged() ? '✓' : ' '
    return `${staged} ${oldLine} ${newLine} ${this.getLineOrigin() || ' '} ${this.getContent()}`
  }

  static fromString(str) {
    let lineMatch = /([ ✓]) ([\d]+|---) ([\d]+|---)(?: ([ +-]) (.+))?$/.exec(str)
    if (!lineMatch) return null

    let [__, staged, oldLine, newLine, lineOrigin, content] = lineMatch
    let line = new HunkLine()

    line.content = content || ''
    line.lineOrigin = lineOrigin
    line.setIsStaged(staged == '✓')

    line.oldLineNumber = oldLine == '---' ? null : parseInt(oldLine)
    line.newLineNumber = newLine == '---' ? null : parseInt(newLine)

    return line
  }

  fromGitUtilsObject({line, diff}) {
    if (!line) return;

    this.content = line.content().split(/[\r\n]/g)[0] // srsly.
    this.lineOrigin = String.fromCharCode(line.origin())

    this.oldLineNumber = null
    this.newLineNumber = null
    if (line.oldLineno() > 0) this.oldLineNumber = line.oldLineno()
    if (line.newLineno() > 0) this.newLineNumber = line.newLineno()
    this.emitChangeEvent()
  }

  static fromGitUtilsObject(obj) {
    const hunkLine = new HunkLine()
    hunkLine.fromGitUtilsObject(obj)
    return hunkLine
  }
}
