"use babel"

let FileSummary = require('./file-summary')
let GitService = require('./git-service')
let {CompositeDisposable, Disposable, Emitter} = require('atom')

class FileList {
  constructor() {
    this.gitService = GitService.instance()
    this.files = []
    this.gitService.onDidUpdateRepository(this.loadGitStatuses)
    this.loadGitStatuses()
    this.emitter = new Emitter()
  }

  onDidChange(callback) {
    return this.emitter.on('did-change', callback)
  }

  getFiles() {
    return this.files
  }

  async loadGitStatuses() {
    let statuses = await this.gitService.getStatuses()
    this.files = []
    for (let status of statuses){
      this.files.push(new FileSummary({status: status}))
    }
    this.emitter.emit('did-change')
  }

  // stageAll() {
  //   this.gitService.stageAllPaths((fileSummary.path() for fileSummary in this.unstaged))
  // }
  //
  // unstageAll() {
  //   this.gitService.unstageAllPaths((fileSummary.path() for fileSummary in this.staged))
  // }
}
module.exports = FileList
