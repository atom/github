Diff = require './diff'
DiffElement = require './diff-element'

class DiffPaneItem extends HTMLElement
  attachedCallback: ->
    @tabIndex = -1
    @classList.add 'pane-item'
    @diff = new Diff(gitIndex: @gitIndex, filePath: @filePath)
    @diffElement = new DiffElement
    @diffElement.initialize(gitIndex: @gitIndex, model: @diff)
    @appendChild(@diffElement)

  initialize: ({@uri, @filePath, @gitIndex}) ->
    @addEventListener 'focus', => @diffElement.focus()

  detatchedCallback: ->

  getTitle: -> 'Diff: ' + @filePath

  getURI: -> @uri

  getPath: -> @filePath

  serialize: ->
    deserializer: 'GitDiffPaneItem'
    uri: @getURI()

module.exports = document.registerElement 'git-diff-pane-item',
  prototype: DiffPaneItem.prototype
