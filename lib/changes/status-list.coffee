# StatusList
# ==========
#
# This is the viewmodel for StatusListElement. It represents the state of the
# list of staged and unstaged changes in the left pane.

FileSummary = require './file-summary'
GitChanges = require './git-changes'
{CompositeDisposable, Disposable} = require 'atom'

module.exports = class StatusList
  constructor: ({@git}) ->
    # We pass around one instance of GitChanges for all view-models.
    @unstaged = []
    @staged = []

  initialize: ->
    @git.onDidUpdateRepository(@loadGitStatuses)
    @loadGitStatuses()

  loadGitStatuses: =>
    @git.getStatuses()
      .then (statuses) =>
        # a status can indicate a file that has both
        # staged and unstaged changes, so it's possible
        # for it to end up in both arrays here.
        @unstaged = statuses.filter((status) => @isUnstaged(status)).map (status) =>
          new FileSummary
            file: status
            status: 'unstaged'
            git: @git

        @staged = statuses.filter((status) => @isStaged(status)).map (status) =>
          new FileSummary
            file: status
            status: 'staged'
            git: @git

  isUnstaged: (status) ->
    bit = status.statusBit()
    codes = @git.statusCodes()

    return bit & codes.WT_NEW ||
           bit & codes.WT_MODIFIED ||
           bit & codes.WT_DELETED ||
           bit & codes.WT_RENAMED ||
           bit & codes.WT_TYPECHANGE

  isStaged: (status) ->
    bit = status.statusBit()
    codes = @git.statusCodes()

    return bit & codes.INDEX_NEW ||
           bit & codes.INDEX_MODIFIED ||
           bit & codes.INDEX_DELETED ||
           bit & codes.INDEX_RENAMED ||
           bit & codes.INDEX_TYPECHANGE


  stageAll: =>
    @git.stageAllPaths((fileSummary.path() for fileSummary in @unstaged))

  unstageAll: =>
    @git.unstageAllPaths((fileSummary.path() for fileSummary in @staged))
