$              = require 'jquery'
SplitView      = require '../utils/split-view'
StatusListElement = require './status-list-view'
DiffView       = require './diff-view'
Changes        = require './changes'

class ChangesView extends SplitView
  # This is the root view for view-and-commit-changes.
  initialize: ({@uri, width}) ->
    @model = new Changes
    @StatusListElement = new StatusListElement

    # The children maintain a reference to the root view
    @StatusListElement.initialize(changesView: @)
    @diffView       = new DiffView

    @width(width) if width > 0

    @setSubViews
      summaryView: @StatusListElement
      detailsView: @diffView

    @update()

  update: ->
    @model.git.emit('did-update-repository')

  getTitle: ->
    'Commit changes'

  getURI: -> @uri

  serialize: ->
    deserializer: 'GitChangesView'
    uri: @getURI()
    width: @width()

module.exports = document.registerElement 'git-changes-view',
  prototype: ChangesView.prototype
