Diff = require './diff'
DiffElement = require './diff-element'

class DiffPaneItem extends HTMLElement
  attachedCallback: ->
    @diff = new Diff(gitIndex: @gitIndex, filePath: @filePath)
    @diffElement = new DiffElement
    @diffElement.initialize(gitIndex: @gitIndex, model: @diff)
    @appendChild(@diffElement)

  initialize: ({@uri, @filePath, @gitIndex}) ->

  detatchedCallback: ->

  getTitle: ->
    'Diff: ' + @filePath

  getURI: -> @uri

  serialize: ->
    deserializer: 'GitDiffPaneItem'
    uri: @getURI()

module.exports = document.registerElement 'git-diff-pane-item',
  prototype: DiffPaneItem.prototype
