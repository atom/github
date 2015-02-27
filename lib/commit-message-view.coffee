$          = require 'jquery'
GitChanges = require './git-changes'

BaseTemplate = """
<atom-text-editor tabindex="-1" class="commit-description" gutter-hidden
  style="height: 120px"></atom-text-editor>
<div class="commit-button">
  <button class="btn btn-commit">Commit to
    <strong class="branch-name"></strong>
  </button>
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
    @branchNode   = @querySelector('.branch-name')

    @messageModel.setSoftWrapped(true)
    @messageModel.setPlaceholderText(PlaceholderText)

    @git = new GitChanges

  attachedCallback: ->
    @base = @el.closest('git-experiment-repository-view')
    @handleEvents()

  handleEvents: ->
    @base.on "index-updated", @update.bind(@)
    @base.on "set-commit-message", @setMessage.bind(@)
    atom.commands.add "git-experiment-commit-message-view atom-text-editor",
      "git-experiment:focus-status-list": @focusStatusList.bind(@)

  update: ->
    @git.getBranchName().then (name) =>
      @branchNode.textContent = name

  focusTextArea: ->
    @messageNode.focus()

  focusStatusList: ->
    @base.trigger('focus-list')

  setMessage: (e, text) ->
    @messageModel.setText(text)

module.exports = document.registerElement 'git-experiment-commit-message-view',
  prototype: CommitMessageView.prototype
