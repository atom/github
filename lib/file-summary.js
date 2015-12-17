/** @babel */

import shell from 'shell'
import fs from 'fs'
import path from 'path'
import FileDiff from './file-diff'
let GitService = null

export default class FileSummary {
  constructor(options) {
    this.fileDiff = new FileDiff()
    this.setPathName('unknown')
    this.setChangeStatus('modified')
  }

  getFileDiff() {
    return this.fileDiff
  }

  getFileName() { return path.basename(this.getPathName()) }

  getPathName() {
    return this.fileDiff.getNewPathName()
  }

  setPathName(pathName) {
    this.fileDiff.setOldPathName(pathName)
    this.fileDiff.setNewPathName(pathName)
  }

  getChangeStatus() { return this.changeType }

  // added, modified, removed, renamed
  setChangeStatus(changeType) {
    this.changeType = changeType
  }

  // Returns {String} one of 'staged', 'unstaged', 'partial'
  getStageStatus() {
    this.fileDiff.getStageStatus()
  }

  stage() {
    this.fileDiff.stage()
  }

  unstage() {
    this.fileDiff.unstage()
  }

  discard() {
  }

  toString() {
    return this.fileDiff.toString()
  }

  fromGitUtilsObject({status, diff}) {
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

      this.setChangeStatus(changeType)
    }
    this.fileDiff.fromGitUtilsObject({diff: diff})
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
