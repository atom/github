$          = require 'jquery'
GitChanges = require './git-changes'

BaseTemplate = """
<atom-text-editor tabindex="-1" class="commit-description" gutter-hidden
  style="height: 120px"></atom-text-editor>
<div class="commit-button">
  <button class="btn btn-commit">Commit</button>
</div>
"""

PlaceholderText = "Please enter a commit message describing your changes"

class CommitMessageView extends HTMLElement
  createdCallback: ->
    # Elements
    @el           = $(@)
    @innerHTML    = BaseTemplate
    @messageNode  = @querySelector('atom-text-editor')
    @messageModel = @messageNode.getModel()
    @buttonNode   = @querySelector('.btn-commit')

    @messageModel.setSoftWrapped(true)
    @messageModel.setPlaceholderText(PlaceholderText)

    @git = new GitChanges

    @handleEvents()

  attachedCallback: ->
    @statusListView = @el.closest('git-experiment-status-list-view')[0]

  handleEvents: ->
    atom.commands.add 'git-experiment-commit-message-view atom-text-editor',
      'git-experiment:focus-status-list': @focusStatusList.bind(@)

  update: ->
    @git.getBranchName().then (name) =>
      @buttonNode.textContent = "Commit to #{name}"

  focusTextArea: ->
    @messageNode.focus()

  focusStatusList: ->
    @statusListView?.focus()

  setMessage: (text) ->
    @messageModel.setText(text)

module.exports = document.registerElement 'git-experiment-commit-message-view',
  prototype: CommitMessageView.prototype
