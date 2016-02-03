/** @babel */

import {Emitter} from 'atom'

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

  emitChangeEvent() {
    this.emitter.emit('did-change')
  }

  toString() {
    oldLine = this.getOldLineNumber() || '---'
    newLine = this.getNewLineNumber() || '---'
    staged = this.isStaged() ? '✓' : ' '
    return `${staged} ${oldLine} ${newLine} ${this.getLineOrigin() || ' '} ${this.getContent()}`
  }

  fromString(str) {
    let lineMatch = /([ ✓]) ([\d]+|---) ([\d]+|---)(?: ([ +-]) (.+))?$/.exec(str)
    if (!lineMatch) return null

    let [__, staged, oldLine, newLine, lineOrigin, content] = lineMatch

    this.content = content || ''
    this.lineOrigin = lineOrigin
    this.setIsStaged(staged == '✓')

    this.oldLineNumber = oldLine == '---' ? null : parseInt(oldLine)
    this.newLineNumber = newLine == '---' ? null : parseInt(newLine)
    this.emitChangeEvent()
  }

  static fromString(str) {
    const hunkLine = new HunkLine()
    hunkLine.fromString(str)
    return hunkLine
  }

  fromGitUtilsObject({line}) {
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
