$ = require 'jquery'
GitHistory = require './git-history'

BaseTemplate = """
<div class="avatar">
  <img src="" />
</div>
<div class="message"></div>
<div class="meta">
  <div>
    <span class="time"></span> by
    <span class="author"></span>
  </div>
  <div class="sha"></div>
</div>
"""

class CommitSummaryView extends HTMLElement
  createdCallback: ->
    @el = $(@)
    @innerHTML   = BaseTemplate
    @shaNode     = @querySelector('.sha')
    @timeNode    = @querySelector('.time')
    @authorNode  = @querySelector('.author')
    @messageNode = @querySelector('.message')
    @avatarNode  = @querySelector('.avatar img')

    @git = new GitHistory

  setId: (oid) ->
    @git.getCommit(oid).then (commit) =>
      parent = commit.parents()[0]
      @dataset.sha = oid.toString()
      @dataset.parent = parent.toString() if parent
      @shaNode.textContent = @shortSha(oid)
      @messageNode.textContent = @firstLine(commit.message())
      @authorNode.textContent = commit.author().name()
      @avatarNode.src = GitHistory.authorAvatar(commit.author().email())

  shortSha: (sha) ->
    sha.toString().substr(0,8)

  firstLine: (message) ->
    message.split("\n")[0]

module.exports = document.registerElement 'git-commit-summary-view',
  prototype: CommitSummaryView.prototype
