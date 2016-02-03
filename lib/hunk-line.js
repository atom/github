/** @babel */

import {Emitter} from 'atom'

export default class HunkLine {
  constructor(options = {}) {
    this.emitter = new Emitter()

    let {content, lineOrigin, staged, oldLineNumber, newLineNumber, fileName} = options
    this.staged = staged
    this.content = content || ''
    this.thisOrigin = lineOrigin
    this.oldLineNumber = oldLineNumber
    this.newLineNumber = newLineNumber
    this.fileName = fileName
  }

  onDidChange(callback) {
    return this.emitter.on('did-change', callback)
  }

  getContent() { return this.content }

  getLineOrigin() { return this.lineOrigin }

  getOldLineNumber() { return this.oldLineNumber }

  getNewLineNumber() { return this.newLineNumber }

  stage() { return this.setIsStaged(true) }

  unstage() { return this.setIsStaged(false) }

  setIsStaged(isStaged) {
    if (this.isStagable()){
      const previousValue = this.staged
      const newValue = isStaged
      this.staged = isStaged
      this.emitChangeEvent()
      if (this.stageFn) {
        return this.stageFn(this, isStaged).catch(e => {
          console.log(e)
          // If the value changed in the meantime, don't restore it.
          if (this.staged !== newValue || !previousValue) return

          // If we didn't have a value previously then keep the set value.
          if (!previousValue) return

          console.log(e)
          this.staged = previousValue
          this.emitChangeEvent()
        })
      } else {
        return Promise.resolve()
      }
    } else {
      return Promise.resolve()
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

  fromGitUtilsObject({line, fileName, stageFn}) {
    if (!line) return;

    this.stageFn = stageFn

    this.content = line.content().split(/[\r\n]/g)[0] // srsly.
    this.lineOrigin = String.fromCharCode(line.origin())

    this.oldLineNumber = null
    this.newLineNumber = null
    if (line.oldLineno() > 0) this.oldLineNumber = line.oldLineno()
    if (line.newLineno() > 0) this.newLineNumber = line.newLineno()
    this.line = line
    this.fileName = fileName
    this.emitChangeEvent()
  }

  static fromGitUtilsObject(obj) {
    const hunkLine = new HunkLine()
    hunkLine.fromGitUtilsObject(obj)
    return hunkLine
  }
}
