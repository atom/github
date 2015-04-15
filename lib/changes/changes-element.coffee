SplitView      = require '../utils/split-view'
StatusListElement = require './status-list-element'
DiffElement       = require './diff-element'
Changes        = require './changes'
observe        = require '../observe'

class ChangesElement extends SplitView
  # This is the root view for view-and-commit-changes.
  initialize: ({@uri, width}) ->
    @model ?= new Changes
    @statusListElement = new StatusListElement
    @diffView = new DiffElement

    # The children maintain a reference to the root view
    @statusListElement.initialize(changesView: @)
    @diffView.initialize(changesView: @)

    @width(width) if width > 0

    @setSubViews
      summaryView: @statusListElement
      detailsView: @diffView

    observe @model, ['renderedPatch'], @renderPatch.bind(@)

    @model.updateRepository()

  getTitle: ->
    'Commit changes'

  getURI: -> @uri

  serialize: ->
    deserializer: 'GitChangesElement'
    uri: @getURI()
    width: @width()

  # Some UI actions need to focus the StatusListElement after completion. The
  # components are loosely coupled so we'll use this view as a DOM event bus.
  focusList: =>
    @dispatchEvent(new Event('focus-list'))

  focusCommitMessage: =>
    @dispatchEvent(new Event('focus-commit-message'))

  noChangeSelected: =>
    @dispatchEvent(new Event('no-change-selected'))

  focusDiffElement: =>
    @dispatchEvent(new Event('focus-diff-view'))

  renderPatch: =>
    @dispatchEvent(new CustomEvent('render-patch', detail: @model.renderedPatch))

module.exports = document.registerElement 'git-changes-view',
  prototype: ChangesElement.prototype
