$          = require 'jquery'
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

class FileSummaryView extends HTMLElement
  initialize: (@statusListView) ->

  createdCallback: ->
    # Elements
    @el           = $(@)
    @innerHTML    = BaseTemplate
    @iconNode     = @querySelector(".icon")
    @dirNode      = @querySelector(".dir")
    @filenameNode = @querySelector(".filename")
    @buttonNode   = @querySelector(".btn")
    @index        = undefined

    @git          = new GitChanges()

  handleEvents: =>
    @el.on "click", ".btn", @stage.bind(@)
    @el.on "dblclick", @stage.bind(@)

  setFile: (@file, @status) ->
    @setPath()
    @setIcon()
    @setButtonText()
    @handleEvents()

  setPath: ->
    @path = @file.path()
    pathParts = @path.split("/")
    filename  = pathParts.pop()
    dir       = pathParts.join('/')
    dir      += "/" if dir

    @dirNode.textContent      = dir
    @filenameNode.textContent = filename

  setIcon: ->
    bit = @file.statusBit()
    codes = @git.statusCodes()

    if @status == 'unstaged'
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
    @buttonNode.textContent = if @status == "staged"
      "Unstage"
    else
      "Stage"

  stage: ->
    console.log 'staging'
    promise = if @status == 'unstaged'
      @git.stagePath(@path)
    else
      @git.unstagePath(@path)

    promise.then =>
      @statusListView.update()

module.exports = document.registerElement "git-experiment-file-summary-view",
  prototype: FileSummaryView.prototype
