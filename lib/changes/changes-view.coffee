$              = require 'jquery'
SplitView      = require '../utils/split-view'
StatusListElement = require './status-list-view'
DiffView       = require './diff-view'
Changes        = require './changes'

class ChangesView extends SplitView
  # This is the root view for view-and-commit-changes.
  initialize: ({@uri, width}) ->
    @model = new Changes
    @statusListElement = new StatusListElement
    @diffView = new DiffView

    # The children maintain a reference to the root view
    @statusListElement.initialize(changesView: @)
    @diffView.initialize(changesView: @)

    @width(width) if width > 0

    @setSubViews
      summaryView: @statusListElement
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
