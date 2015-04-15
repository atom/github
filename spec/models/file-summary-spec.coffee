FileSummary = require '../../lib/changes/file-summary'
GitChanges = require '../../lib/changes/git-changes'

describe "FileSummary", ->
  beforeEach ->
    @fileSummary = new FileSummary
      git: new GitChanges
      file: {path: -> '/some/path'}

  it "stages if status is unstaged", ->
    @fileSummary.status = 'unstaged'
    spyOn(@fileSummary.git, 'stagePath').andReturn(new Promise () ->)
    @fileSummary.stage()
    expect(@fileSummary.git.stagePath).toHaveBeenCalled()

  it "unstages if status is not unstaged", ->
    @fileSummary.status = 'staged'
    spyOn(@fileSummary.git, 'unstagePath').andReturn(new Promise () ->)
    @fileSummary.stage()
    expect(@fileSummary.git.unstagePath).toHaveBeenCalled()
