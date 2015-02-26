$ = require 'jquery'
StatusListView = require './status-list-view'

BaseTemplate = """
<div class="resizeable">
  <div class="summary"></div>
  <div class="repository-view-resizer"></div>
</div>
<div class="details"></div>
"""

class RepositoryView extends HTMLElement

  @statusListView: null

  initialize: ({@uri, width}) ->
    # Elements
    @el             = $(@)
    @innerHTML      = BaseTemplate
    @summaryNode    = @querySelector('.summary')
    @detailsNode    = @querySelector('.details')
    @resizeableNode = @querySelector('.resizeable')
    @resizerNode    = @querySelector('.repository-view-resizer')

    # Child Nodes
    @statusListView = new StatusListView()
    @statusListView.initialize(@)
    @summaryNode.appendChild(@statusListView)

    @statusListView.focus()
    @statusListView.update()

    @width(width) if width > 0
    @handleEvents()

  handleEvents: =>
    @el.on 'mousedown', '.repository-view-resizer', (e) => @resizeStarted(e)

  getTitle: ->
    'Repository'

  getURI: -> @uri

  width: (setter) ->
    if setter
      @resizeableNode.style.width = "#{setter}px"
    else
      $(@resizeableNode).width()

  serialize: ->
    deserializer: 'GitRepositoryView'
    uri: @getURI()
    width: @width()

  resizeStarted: =>
    @el.on('mousemove', @resizeSummary)
    @el.on('mouseup', @resizeStopped)

  resizeStopped: =>
    @el.off('mousemove', @resizeSummary)
    @el.off('mouseup', @resizeStopped)

  resizeSummary: ({pageX, which, currentTarget}) =>
    return @resizeStopped() unless which is 1
    @width(pageX - @el.offset().left + @resizerNode.offsetWidth)

module.exports = document.registerElement 'git-experiment-repository-view',
  prototype: RepositoryView.prototype
