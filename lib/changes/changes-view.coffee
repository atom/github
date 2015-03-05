$              = require 'jquery'
SplitView      = require '../utils/split-view'
StatusListView = require './status-list-view'
DiffView       = require './diff-view'

class ChangesView extends SplitView
  initialize: ({@uri, width}) ->
    @statusListView = new StatusListView
    @diffView       = new DiffView

    @width(width) if width > 0

    @setSubViews
      summaryView: @statusListView
      detailsView: @diffView

    @update()

  update: ->
    @el.trigger('index-updated')

  getTitle: ->
    'Commit changes'

  getURI: -> @uri

  serialize: ->
    deserializer: 'GitChangesView'
    uri: @getURI()
    width: @width()

module.exports = document.registerElement 'git-changes-view',
  prototype: ChangesView.prototype
