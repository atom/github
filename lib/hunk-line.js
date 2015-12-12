/** @babel */

export default class HunkLine {
  constructor(options) {
    this.updateFromGitUtilsObject(options || {})
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
}
