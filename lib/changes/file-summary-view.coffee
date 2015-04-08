{CompositeDisposable, Disposable} = require 'atom'

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

# model=
#   file:
#     path: -> String
#     statusBit: -> Enum
#   status: String

class FileSummaryView extends HTMLElement
  initialize: (@model) ->
    @model.observe ['file', 'status'], @update.bind(@)
    @subscriptions = new CompositeDisposable
    @update()


  createdCallback: ->
    # Elements
    @innerHTML    = BaseTemplate
    @iconNode     = @querySelector(".icon")
    @dirNode      = @querySelector(".dir")
    @filenameNode = @querySelector(".filename")
    @buttonNode   = @querySelector(".btn")
    @index        = undefined

  attachedCallback: ->
    @handleEvents()

  handleEvents: =>
    boundStage = @stage.bind(@)
    @querySelector('.btn').addEventListener('click', boundStage)
    @addEventListener('dblclick', boundStage)

    @subscriptions.add new Disposable =>
      @querySelector('.btn').removeEventListener(boundStage)
      @removeEventListener(boundStage)

  detatchedCallback: ->
    @subscriptions.dispose()

  update: (model) =>
    @model = model if model
    @setPath()
    @setIcon()
    @setButtonText()

  setPath: ->
    [dir, filename] = @model.pathInfo()
    @dirNode.textContent      = dir
    @filenameNode.textContent = filename

  setIcon: ->
    @iconNode.classList.add("status-#{@model.iconClass()}")
    @iconNode.classList.add("icon-diff-#{@model.iconClass()}")

  setButtonText: ->
    @buttonNode.textContent = @model.buttonText()

  stage: (e) =>
    e?.stopImmediatePropagation()
    @model.stage()

module.exports = document.registerElement "git-file-summary-view",
  prototype: FileSummaryView.prototype
