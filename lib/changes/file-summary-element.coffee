# FileSummaryElement
# ==================
#
# This is the element that is shown in the left pane when committing under
# "Unstaged changes" and "Staged changes". It shows the filename for a change,
# color coded and with an icon for add/remove/modify, and affords stage and
# unstage actions.

{CompositeDisposable, Disposable} = require 'atom'

observe = require '../observe'

BaseTemplate = """
<div>
  <span class="icon"></span>
  <span class="path">
    <span class="dir"></span>
    <span class="filename"></span>
  </span>
</div>
<button class="btn btn-xs"></button>
"""

class FileSummaryElement extends HTMLElement
  initialize: ({@model}) ->
    observe @model, ['file', 'status'], @update.bind(this)
    @subscriptions = new CompositeDisposable
    @update()


  createdCallback: ->
    # Elements
    @innerHTML    = BaseTemplate
    @iconNode     = @querySelector(".icon")
    @dirNode      = @querySelector(".dir")
    @filenameNode = @querySelector(".filename")
    @buttonNode   = @querySelector(".btn")

  attachedCallback: ->
    # Handle events
    boundStage = @stage.bind(this)
    select = @select.bind(this)
    @querySelector('.btn').addEventListener('click', boundStage)
    @addEventListener('dblclick', boundStage)
    @addEventListener('click', select)

    @subscriptions.add new Disposable =>
      @querySelector('.btn').removeEventListener('click', boundStage)
      @removeEventListener('dblclick', boundStage)
      @removeEventListener('click', select)

  detatchedCallback: ->
    @subscriptions.dispose()

  update: ->
    @setPath()
    @setIcon()
    @setButtonText()

  setPath: =>
    [dir, filename] = @model.getPathInfo()
    @dirNode.textContent      = dir
    @filenameNode.textContent = filename

  setIcon: ->
    @iconNode.classList.add("status-#{@model.getIconClass()}")
    @iconNode.classList.add("icon-diff-#{@model.getIconClass()}")

  setButtonText: ->
    @buttonNode.textContent = @model.getButtonText()

  stage: (e) =>
    e?.stopImmediatePropagation()
    @model.stage()

  deselect: (e) =>
    @classList.remove('selected')

  select: (e) =>
    @classList.add('selected')
    # @changesView.model.setRenderedPatch(@model)


module.exports = document.registerElement "git-file-summary-element",
  prototype: FileSummaryElement.prototype
