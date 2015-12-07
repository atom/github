"use babel"

let FileSummary = require('./file-summary')
let GitService = require('./git-service')
let {CompositeDisposable, Disposable, Emitter} = require('atom')

export default class FileList {
  constructor() {
    this.gitService = GitService.instance()
    this.files = []
    this.emitter = new Emitter()
  }

  onDidChange(callback) {
    return this.emitter.on('did-change', callback)
  }

  getFiles() {
    return this.files
  }

  toString() {
    return this.files.map((file) => { return file.toString() }).join('\n')
  }

  async loadFromGitUtils() {
    let statuses = await this.gitService.getStatuses()
    let diffs = await this.gitService.getDiffs('all')

    let diffsByPathName = {}
    for(let diff of diffs) {
      diffsByPathName[diff.newFile().path()] = diff
    }

    console.log(diffsByPathName);
    this.files = []
    for (let status of statuses) {
      let diff = diffsByPathName[status.path()]
      this.files.push(new FileSummary({status: status, diff: diff}))
    }
    this.emitter.emit('did-change')

    setTimeout(() => {
      console.log('EVERYTHING--------');
      console.log(this.toString());
    }, 200)
  }

  // stageAll() {
  //   this.gitService.stageAllPaths((fileSummary.path() for fileSummary in this.unstaged))
  // }
  //
  // unstageAll() {
  //   this.gitService.unstageAllPaths((fileSummary.path() for fileSummary in this.staged))
  // }
}
