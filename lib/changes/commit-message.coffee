module.exports = class CommitMessage
  constructor: ({@branchName, @stagedCount, @message, @git, @complete}) ->
    @stagedCount ?= 0
    @message ?= ''
    @complete ?= false

  initialize: ->
    @refreshBranch()

  reset: ->
    @complete = false
    @message = ''

  refreshBranch: =>
    @git.getBranchName().then (name) =>
      @branchName = name

  canCommit: ->
    @stagedCount > 0 and @message.trim()

  setStagedCount: (count) ->
    @stagedCount = count

  commit: =>
    return false unless @canCommit()
    @git.commit(@message.trim()).then =>
      @message = ''
      @complete = true
