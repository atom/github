module.exports = class CommitMessage
  constructor: ({@branchName, @stagedCount, @message, @gitIndex, @complete}) ->
    @stagedCount ?= 0
    @message ?= ''
    @complete ?= false

  initialize: ->
    @refreshBranch()

  reset: ->
    @complete = false
    @message = ''

  refreshBranch: =>
    @gitIndex.getBranchName().then (name) =>
      @branchName = name

  canCommit: ->
    @stagedCount > 0 and @message.trim()

  setStagedCount: (count) ->
    @stagedCount = count

  commit: =>
    return false unless @canCommit()
    @gitIndex.commit(@message.trim()).then =>
      @message = ''
      @complete = true
