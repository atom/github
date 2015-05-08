FileSummary = require '../../lib/changes/file-summary'
GitIndex = require '../../lib/changes/git-changes'

describe "FileSummary", ->
  beforeEach ->
    @fileSummary = new FileSummary
      gitIndex: new GitIndex
      file: {path: -> '/some/path'}

  it "stages if status is unstaged", ->
    @fileSummary.status = 'unstaged'
    spyOn(@fileSummary.gitIndex, 'stagePath').andReturn(new Promise -> )
    @fileSummary.stage()
    expect(@fileSummary.gitIndex.stagePath).toHaveBeenCalled()

  it "unstages if status is not unstaged", ->
    @fileSummary.status = 'staged'
    spyOn(@fileSummary.gitIndex, 'unstagePath').andReturn(new Promise -> )
    @fileSummary.stage()
    expect(@fileSummary.gitIndex.unstagePath).toHaveBeenCalled()
