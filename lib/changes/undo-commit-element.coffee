GitIndex = require './git-changes'
timeago    = require 'timeago'
{CompositeDisposable, Disposable} = require 'atom'

BaseTemplate = """
<button class="btn undo-button">Undo</button>
<div class="description">Committed <span class="time"></span></div>
<div class="title"></div>
"""

class UndoCommitElement extends HTMLElement
  createdCallback: ->
    # Elements
    @innerHTML  = BaseTemplate
    @buttonNode = @querySelector('.btn')
    @titleNode  = @querySelector('.title')
    @timeNode   = @querySelector('.time')

    @disposables = new CompositeDisposable
    @gitIndex = new GitIndex

  initialize: ({@gitIndex}) ->

  attachedCallback: ->
    @handleEvents()

  handleEvents: ->
    undo = @undoCommit.bind(this)
    @querySelector('.undo-button').addEventListener('click', undo)
    @disposables.add new Disposable =>
      @querySelector('.undo-button').removeEventListener(undo)

  detachedCallback: ->
    @disposables.dispose()

  update: ->
    @gitIndex.getLatestUnpushed().then (commit) =>
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
    @gitIndex.getLatestUnpushed().then (commit) =>
      # @changesView.setCommitMessage(commit.message())
      @gitIndex.resetBeforeCommit(commit).then ->
        #@base.trigger("") # what was this supposed to be?

module.exports = document.registerElement 'git-undo-commit-view',
  prototype: UndoCommitElement.prototype
