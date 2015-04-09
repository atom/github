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
  initialize: ({@changesView}) ->

  createdCallback: ->
    # Elements
    @el           = $(@)
    @innerHTML    = BaseTemplate
    @messageNode  = @querySelector('atom-text-editor')
    @messageModel = @messageNode.getModel()
    @branchNode   = @querySelector('.branch-name')
    @buttonNode   = @querySelector('.btn')

    @messageModel.setSoftWrapped(true)
    @messageModel.setPlaceholderText(PlaceholderText)

    @stagedCount = 0

    @git = new GitChanges
    @update()

  attachedCallback: ->
    @base = @el.closest('.git-root-view')
    @handleEvents()

  handleEvents: ->
    @updateSubscription = @changesView.model.git.onDidUpdateRepository(@update.bind(@))
    @base.on "set-commit-message", @setMessage.bind(@)

    @el.on "click", '.btn', @commit.bind(@)

    @messageSub = @messageModel.onDidChange @updateCommitButton.bind(@)

    @commandSub = atom.commands.add "git-commit-message-view atom-text-editor:not(.mini)",
      "git:focus-status-list": @changesView.focusList.bind(@)
      "git:commit": @commit.bind(@)

  detatchedCallback: ->
    @updateSubscription?.dispose()
    @base.off "set-commit-message"
    @el.off "click", ".btn"

    if @messagesSub
      @messagesSub.dispose()
      @messagesSub = null

    if @commandSub
      @commandSub.dispose()
      @commandSub = null

  update: ->
    @updateCommitButton()
    @git.getBranchName().then (name) =>
      @branchNode.textContent = name

  focusTextArea: ->
    @messageNode.focus()

  setMessage: (e, text) ->
    @messageModel.setText(text)

  getMessage: ->
    $.trim(@messageModel.getText())

  setStagedCount: (count) ->
    @stagedCount = count
    @updateCommitButton()

  canCommit: ->
    @stagedCount > 0 and @getMessage()

  updateCommitButton: ->
    @buttonNode.disabled = !@canCommit()

  commit: ->
    return unless @canCommit()
    @git.commit(@getMessage()).then =>
      @messageModel.setText('')
      @base.trigger('set-commit-message', [''])

module.exports = document.registerElement 'git-commit-message-view',
  prototype: CommitMessageView.prototype
