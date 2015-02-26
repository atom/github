$                 = require 'jquery'
GitChanges        = require './git-changes'

BaseTemplate = """
<div class="unstaged column-header">Unstaged changes
  <button class="btn btn-xs">Stage all</button>
</div>
<div class="unstaged files"></div>
<div class="staged column-header">Staged changes
  <button class="btn btn-xs">Unstage all</button>
</div>
<div class="staged files"></div>
<div class="staged column-header">Commit message</div>
<div class="commit-message-box"></div>
<div class="undo-last-commit-box"></div>
"""

class StatusListView extends HTMLElement
  initialize: (@repositoryView) ->

  createdCallback: ->
    # Elements
    @el               = $(@)
    @innerHTML        = BaseTemplate
    @tabIndex         = -1
    @stagedNode       = @querySelector(".files.staged")
    @unstagedNode     = @querySelector(".files.unstaged")
    @commitMessageBox = @querySelector(".commit-message-box")
    @undoCommitBox    = @querySelector(".undo-last-commit-box")

    @git = new GitChanges()

    @handleEvents()

  handleEvents: =>
    atom.commands.add "git-experiment-status-list-view",
      'core:move-down': @moveSelectionDown
      'core:move-up': @moveSelectionUp
  update: ->
    @git.getStatuses()
    .then (statuses) =>
      @stagedNode.innerHTML = ''
      @unstagedNode.innerHTML = ''
module.exports = document.registerElement "git-experiment-status-list-view",
  prototype: StatusListView.prototype
