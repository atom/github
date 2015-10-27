# StatusList
# ==========
#
# This is the viewmodel for StatusListElement. It represents the state of the
# list of staged and unstaged changes in the left pane.

FileSummary = require './file-summary'
GitIndex = require './git-changes'
{CompositeDisposable, Disposable} = require 'atom'

module.exports = class StatusList
  constructor: ({@gitIndex}) ->
    # We pass around one instance of GitIndex for all view-models.
    @unstaged = []
    @staged = []

  initialize: ->
    @gitIndex.onDidUpdateRepository(@loadGitStatuses)
    @loadGitStatuses()

  loadGitStatuses: =>
    @gitIndex.getStatuses()
      .then (statuses) =>
        # a status can indicate a file that has both
        # staged and unstaged changes, so it's possible
        # for it to end up in both arrays here.
        @unstaged = statuses.filter((status) => @isUnstaged(status)).map (status) =>
          new FileSummary
            file: status
            status: 'unstaged'
            gitIndex: @gitIndex

        @staged = statuses.filter((status) => @isStaged(status)).map (status) =>
          new FileSummary
            file: status
            status: 'staged'
            gitIndex: @gitIndex

  isUnstaged: (status) ->
    bit = status.statusBit()
    codes = @gitIndex.statusCodes()

    return bit & codes.WT_NEW ||
           bit & codes.WT_MODIFIED ||
           bit & codes.WT_DELETED ||
           bit & codes.WT_RENAMED ||
           bit & codes.WT_TYPECHANGE

  isStaged: (status) ->
    bit = status.statusBit()
    codes = @gitIndex.statusCodes()

    return bit & codes.INDEX_NEW ||
           bit & codes.INDEX_MODIFIED ||
           bit & codes.INDEX_DELETED ||
           bit & codes.INDEX_RENAMED ||
           bit & codes.INDEX_TYPECHANGE


  stageAll: =>
    @gitIndex.stageAllPaths((fileSummary.path() for fileSummary in @unstaged))

  unstageAll: =>
    @gitIndex.unstageAllPaths((fileSummary.path() for fileSummary in @staged))

StatusListElement = null
atom.views.addViewProvider StatusList, (statusList) ->
  StatusListElement ?= require './status-list-element'
  statusListElement = new StatusListElement
  statusListElement.initialize(model: statusList)
  statusListElement
