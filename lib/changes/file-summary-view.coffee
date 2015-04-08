{CompositeDisposable, Disposable} = require 'atom'
GitChanges = require './git-changes'

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
    @model.observe ['file', 'status'], @setFile.bind(@)
    @subscriptions = new CompositeDisposable
    @setFile()


  createdCallback: ->
    # Elements
    @innerHTML    = BaseTemplate
    @iconNode     = @querySelector(".icon")
    @dirNode      = @querySelector(".dir")
    @filenameNode = @querySelector(".filename")
    @buttonNode   = @querySelector(".btn")
    @index        = undefined

    @git = new GitChanges

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

  setFile: (model) =>
    @model = model if model
    @setPath()
    @setIcon()
    @setButtonText()

  setPath: ->
    pathParts = @model.file.path().split("/")
    filename  = pathParts.pop()
    dir       = pathParts.join('/')
    dir      += "/" if dir

    @dirNode.textContent      = dir
    @filenameNode.textContent = filename

  setIcon: ->
    bit = @model.file.statusBit()
    codes = @git.statusCodes()

    if @model.status == 'unstaged'
      className = if bit & codes.WT_NEW
        'added'
      else if bit & codes.WT_RENAMED
        'renamed'
      else if bit & codes.WT_DELETED
        'removed'
      else
        'modified'
    else
      className = if bit & codes.INDEX_NEW
        'added'
      else if bit & codes.INDEX_RENAMED
        'renamed'
      else if bit & codes.INDEX_DELETED
        'removed'
      else
        'modified'
    @iconNode.classList.add("status-#{className}")
    @iconNode.classList.add("icon-diff-#{className}")

  setButtonText: ->
    @buttonNode.textContent = if @model.status == "staged"
      "Unstage"
    else
      "Stage"

  stage: (e) =>
    e?.stopImmediatePropagation()

    promise = if @model.status == 'unstaged'
      @git.stagePath(@model.file.path())
    else
      @git.unstagePath(@model.file.path())

    promise.then =>
      atom.emit('did-update-git-repository')

module.exports = document.registerElement "git-file-summary-view",
  prototype: FileSummaryView.prototype
