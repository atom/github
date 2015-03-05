$         = require 'jquery'
SplitView = require '../utils/split-view'
GitHistory = require './git-history'
CommitListView = require './commit-list-view'
CommitDetailsView = require './commit-details-view'

class HistoryView extends SplitView
  initialize: ({@uri, width}) ->
    @width(width) if width > 0
    @git = new GitHistory

    @commitListView = new CommitListView
    @commitDetailsView = new CommitDetailsView

    @setSubViews
      summaryView: @commitListView
      detailsView: @commitDetailsView

  update: ->
    @commitListView.update()

  detatchedCallback: ->
    @destroy()

  getTitle: ->
    'Branch history'

  getURI: -> @uri

  serialize: ->
    deserializer: 'GitHistoryView'
    uri: @getURI()
    width: @width()

module.exports = document.registerElement 'git-experiment-history-view',
  prototype: HistoryView.prototype
