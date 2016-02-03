/** @babel */

import {Emitter, Range} from 'atom'
import Git from 'nodegit'
import GitService from './git-service'

export default class HunkLine {
  constructor(options) {
    this.emitter = new Emitter()

    let {content, lineOrigin, staged, oldLineNumber, newLineNumber, fileName} = options || {}
    this.staged = staged
    this.content = content || ''
    this.thisOrigin = lineOrigin
    this.oldLineNumber = oldLineNumber
    this.newLineNumber = newLineNumber
    this.fileName = fileName

    this.gitService = GitService.instance()
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

  stage() { return this.setIsStaged(true) }

  unstage() { return this.setIsStaged(false) }

  setIsStaged(isStaged) {
    if (this.isStagable()){
      const previousValue = this.staged
      const newValue = isStaged
      this.staged = isStaged
      this.emitChangeEvent()

      return this._stage(!isStaged).catch(e => {
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
  }

  async _stage(state) {
    // TODO: I don't love our model object touching the repository directly :\
    let repo = null
    try {
      repo = await Git.Repository.open(this.gitService.repoPath)
    } catch (e) {
      // TODO: Means we're not actually in a repo. Fine for now.
      return Promise.resolve()
    }

    if (!this.line) {
      return Promise.resolve()
    }

    return repo.stageLines(this.fileName, [this.line], state)
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
    this.line = line
    this.fileName = diff.getOldFileName()
    this.emitChangeEvent()
  }

  static fromGitUtilsObject(obj) {
    const hunkLine = new HunkLine()
    hunkLine.fromGitUtilsObject(obj)
    return hunkLine
  }
}
