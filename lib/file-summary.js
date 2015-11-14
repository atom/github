"use babel"

let shell = require('shell')
let fs = require('fs')
let path = require('path')
let FileDiff = require('./file-diff')
let GitService = null

export default  class FileSummary {
  constructor(options) {
    this.fileDiff = new FileDiff()
    this.setPathName('unknown')
    this.setChangeType('modified')
    this.updateFromGitUtilsObject(options)
  }

  toString() {
    let header = `FILE ${this.getPathName()} - ${this.getChangeType()} - ${this.getStageStatus()}`
    return `${header}\n${this.fileDiff.toString()}`
  }

  updateFromGitUtilsObject({status, diff}) {
    if (status) {
      this.setPathName(status.path())

      if (GitService == null) GitService = require('./git-service')
      let codes = GitService.statusCodes()
      let bit = status.statusBit()

      let changeType = 'modified'
      if (bit & codes.WT_NEW || bit & codes.INDEX_NEW)
        changeType = 'added'
      else if (bit & codes.WT_RENAMED || bit & codes.INDEX_RENAMED)
        changeType = 'renamed'
      else if (bit & codes.WT_DELETED || bit & codes.INDEX_DELETED)
        changeType = 'removed'

      this.setChangeType(changeType)
    }
    this.fileDiff.updateFromGitUtilsObject({diff: diff})
  }

  getFileName() { return path.basename(this.pathName) }

  getPathName() { return this.pathName }

  setPathName(pathName) {
    this.pathName = pathName
  }

  getChangeType() { return this.changeType }

  // added, modified, removed, renamed
  setChangeType(changeType) {
    this.changeType = changeType
  }

  // staged, unstaged, partial
  getStageStatus() {
    // dive into the rest of the structure to figure it out
    return 'unstaged'
  }

  stage() {
  }

  unstage() {
  }

  discard() {
  }
}
  // Maybe move out of this class

  // open->
  //   console.log 'open', this.path()
  //   atom.workspace.open(this.path()) if this.exists()
  //
  // openDiff->
  //   console.log 'open diff', this.path()
  //   atom.workspace.open('atom://git/diff/' + this.path())

// isUnstaged(status) {
//   bit = this.status.statusBit()
//   codes = this.gitService.statusCodes()
//
//   return bit & codes.WT_NEW ||
//          bit & codes.WT_MODIFIED ||
//          bit & codes.WT_DELETED ||
//          bit & codes.WT_RENAMED ||
//          bit & codes.WT_TYPECHANGE
// }
//
// isStaged(status) {
//   bit = status.statusBit()
//   codes = this.gitService.statusCodes()
//
//   return bit & codes.INDEX_NEW ||
//          bit & codes.INDEX_MODIFIED ||
//          bit & codes.INDEX_DELETED ||
//          bit & codes.INDEX_RENAMED ||
//          bit & codes.INDEX_TYPECHANGE
// }
