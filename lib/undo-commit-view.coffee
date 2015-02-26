$          = require 'jquery'
GitChanges = require './git-changes'

BaseTemplate = """
<button class="btn">Undo</button>
<div class="description">Committed <span class="time"></span></div>
<div class="title"></div>
"""

class UndoCommitView extends HTMLElement
  createdCallback: ->
    # Elements
    @el           = $(@)
    @innerHTML    = BaseTemplate
    @buttonNode   = @querySelector('.btn')

    @git = new GitChanges()

    @handleEvents()

  handleEvents: =>

module.exports = document.registerElement 'git-experiment-undo-commit-view',
  prototype: UndoCommitView.prototype
