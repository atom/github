$          = require 'jquery'
GitChanges = require './git-changes'
timeago    = require 'timeago'

BaseTemplate = """
<button class="btn">Undo</button>
<div class="description">Committed <span class="time"></span></div>
<div class="title"></div>
"""

class UndoCommitView extends HTMLElement
  createdCallback: ->
    # Elements
    @el         = $(@)
    @innerHTML  = BaseTemplate
    @buttonNode = @querySelector('.btn')
    @titleNode  = @querySelector('.title')
    @timeNode   = @querySelector('.time')

    @git = new GitChanges

  attachedCallback: ->
    @base = @el.closest('.git-root-view')
    @handleEvents()

  handleEvents: ->
    @el.on 'click', '.btn', @undoCommit.bind(@)

  detatchedCallback: ->
    @el.off 'click', '.btn'

  update: ->
    @git.getLatestUnpushed().then (commit) =>
      if commit
        @titleNode.textContent = commit.message()
        @timeNode.textContent = timeago(commit.date())
        if commit.parents().length
          @buttonNode.style.display = 'inline-block'
        else
          @buttonNode.style.display = 'none'
        @classList.add('show')
      else
        @classList.remove('show')

  undoCommit: ->
    @git.getLatestUnpushed().then (commit) =>
      @base.trigger('set-commit-message', [commit.message()])
      @git.resetBeforeCommit(commit).then =>
        @base.trigger("")

module.exports = document.registerElement 'git-undo-commit-view',
  prototype: UndoCommitView.prototype
