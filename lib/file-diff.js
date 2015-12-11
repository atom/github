"use babel"

export default class FileDiff {
  constructor(options) {
    this.newPathName = 'unknown'
    this.oldPathName = 'unknown'
    this.hunks = []
    this.updateFromGitUtilsObject(options || {})
  }

  toString() {
    let hunks = this.hunks.map((hunk) => { return hunk.toString() }).join('\n');
    return `${this.getOldPathName()} -> ${this.getNewPathName()}\n${hunks}`
  }

  async updateFromGitUtilsObject({diff}) {
    if (!diff) return;

    this.oldPathName = diff.oldFile().path()
    this.newPathName = diff.newFile().path()
    this.size = diff.size()
    this.renamed = diff.isRenamed()
    this.added = diff.isAdded()
    this.untracked = diff.isUntracked()
    this.deleted = diff.isDeleted()

    for (let hunk of (await diff.hunks())) {
      this.hunks.push(new DiffHunk({hunk: hunk}))
    }
  }

  getHunks() { return this.hunks }

  getOldPathName() { return this.oldPathName }

  setOldPathName(oldPathName) {
    this.oldPathName = oldPathName
  }

  getNewPathName() { return this.newPathName }

  setNewPathName(newPathName) {
    this.newPathName = newPathName
  }

  size() { return this.size }

  getChangeStatus() {
    if (this.isAdded())
      return 'added'
    else if (this.isDeleted())
      return 'deleted'
    else if (this.isRenamed())
      return 'renamed'
    else
      return 'modified'
  }

  isRenamed() { return this.renamed }

  isAdded() { return this.added }

  isUntracked() { return this.untracked }

  isDeleted() { return this.deleted }
}

class DiffHunk {
  constructor(options) {
    this.lines = []
    this.updateFromGitUtilsObject(options)
  }

  toString() {
    lines = this.lines.map((line) => { return line.toString() }).join('\n')
    return `${this.getHeader()}\n${lines}`
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
}

class HunkLine {
  constructor(options) {
    this.lines = []
    this.updateFromGitUtilsObject(options)
  }

  toString() {
    oldLine = this.getOldLineNumber() || '---'
    newLine = this.getNewLineNumber() || '---'
    staged = this.isStaged() ? '✓' : ' '
    return `${staged} ${oldLine} ${newLine} ${this.getLineOrigin() || ' '} ${this.getContent()}`
  }

  updateFromGitUtilsObject({line}) {
    if (!line) return;

    this.content = line.content().split(/[\r\n]/g)[0] // srsly.
    this.lineOrigin = String.fromCharCode(line.origin())

    this.oldLineNumber = null
    this.newLineNumber = null
    if (line.oldLineno() > 0) this.oldLineNumber = line.oldLineno()
    if (line.newLineno() > 0) this.newLineNumber = line.newLineno()
  }

  getContent() { return this.content }

  getLineOrigin() { return this.lineOrigin }

  getOldLineNumber() { return this.oldLineNumber }

  getNewLineNumber() { return this.newLineNumber }

  setIsStaged(isStaged) {
    this.staged = isStaged
  }

  isStaged() { return this.staged }

  isAddition() { return this.lineOrigin === '+' }

  isDeletion() { return this.lineOrigin === '-' }

  isContext() { return !(this.isAddition() || this.isDeletion()) }
}
