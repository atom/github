StatusListElement = require '../../lib/changes/status-list-element'
StatusList = require '../../lib/changes/status-list'
GitChanges = require '../../lib/changes/git-changes'

describe 'StatusListElement', ->
  beforeEach ->
    @statusList = new StatusListElement({})
    @statusList.initialize git: new GitChanges

  xit "responds to some events the right way", -> #TODO
