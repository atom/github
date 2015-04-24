# Right now this viewmodel just fires off a bunch of git stuff, there isn't
# much to test. I feel like a lot of the stuff it does should be pushed lower to
# the data model representing the git index.

StatusList = require '../../lib/changes/status-list.coffee'

describe 'StatusList', ->
  beforeEach ->
    @statusList = new StatusList({})
