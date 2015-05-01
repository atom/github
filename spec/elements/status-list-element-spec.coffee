StatusListElement = require '../../lib/changes/status-list-element'
StatusList = require '../../lib/changes/status-list'
GitIndex = require '../../lib/changes/git-changes'

describe 'StatusListElement', ->
  beforeEach ->
    @statusList = new StatusListElement({})
    @statusList.initialize gitIndex: new GitIndex

  xit "responds to some events the right way", -> #TODO
