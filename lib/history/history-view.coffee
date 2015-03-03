$         = require 'jquery'
SplitView = require '../utils/split-view'

class HistoryView extends SplitView
  initialize: ({@uri, width}) ->
    @width(width) if width > 0

  update: ->

  getTitle: ->
    'Branch history'

  getURI: -> @uri

  serialize: ->
    deserializer: 'GitChangesView'
    uri: @getURI()
    width: @width()

module.exports = document.registerElement 'git-experiment-history-view',
  prototype: HistoryView.prototype
