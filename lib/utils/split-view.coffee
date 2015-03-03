$ = require 'jquery'

BaseTemplate = """
<div class="resizeable">
  <div class="summary"></div>
  <div class="repository-view-resizer"></div>
</div>
<div class="details"></div>
"""

class SplitView extends HTMLElement
  createdCallback: ->
    # Elements
    @el             = $(@)
    @innerHTML      = BaseTemplate
    @summaryNode    = @querySelector('.summary')
    @detailsNode    = @querySelector('.details')
    @resizeableNode = @querySelector('.resizeable')
    @resizerNode    = @querySelector('.repository-view-resizer')

    @classList.add('git-experiment-root-view')
    @handleEvents()

  setSubViews: ({@summaryView, @detailsView}) =>
    @summaryNode.appendChild(@summaryView)
    @detailsNode.appendChild(@detailsView)

  handleEvents: ->
    @el.on 'mousedown', '.repository-view-resizer', @resizeStarted.bind(@)
    $(window).on 'focus', @updateIfActive.bind(@)

    process.nextTick =>
      # HACK: atom.workspace is weirdly not available when this is deserialized
      atom.workspace.onDidChangeActivePaneItem (pane) =>
        @update() if pane == @

    process.nextTick => @updateIfActive()

  updateIfActive: ->
    @update() if atom.workspace?.getActivePaneItem() == @

  update: ->

  width: (setter) =>
    if setter
      @resizeableNode.style.width = "#{setter}px"
    else
      $(@resizeableNode).width()

  resizeStarted: =>
    @el.on('mousemove', @resizeSummary.bind(@))
    @el.on('mouseup', @resizeStopped.bind(@))

  resizeStopped: =>
    @el.off('mousemove')
    @el.off('mouseup')

  resizeSummary: ({pageX, which, currentTarget}) ->
    return @resizeStopped() unless which is 1
    @width(pageX - @el.offset().left + @resizerNode.offsetWidth)

module.exports = SplitView
