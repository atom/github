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
  initialize: (@model) ->
    observe @model, ['file', 'status'], @update.bind(@)
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
    boundStage = @stage.bind(@)
    @querySelector('.btn').addEventListener('click', boundStage)
    @addEventListener('dblclick', boundStage)

    @subscriptions.add new Disposable =>
      @querySelector('.btn').removeEventListener(boundStage)
      @removeEventListener(boundStage)

  detatchedCallback: ->
    @subscriptions.dispose()

  update: ->
    @setPath()
    @setIcon()
    @setButtonText()

  setPath: ->
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

module.exports = document.registerElement "git-file-summary-element",
  prototype: FileSummaryElement.prototype
