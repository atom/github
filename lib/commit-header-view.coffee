timeago = require 'timeago'
History = require './git-history'

CommitHeaderTemplateString = """
  <div class="commit-header">
    <div class="message"></div>
    <div class="description"></div>
    <div class="meta">
      <div><span class="avatar"><img src="" /></span> <span class="author"></span></div>
      <div><span class="icon icon-git-commit"></span> <span class="sha"></span></div>
      <div><span class="icon icon-history"></span> <span class="time"></span></div>
    </div>
  </div>
"""

class CommitHeaderView extends HTMLElement
  setData: (@commit) ->
    @innerHTML = CommitHeaderTemplateString
    @querySelector('.sha').textContent = @commit.sha().slice(0,8)
    @querySelector('.author').textContent = @commit.author().name()
    @querySelector('.time').textContent = timeago(@commit.date())
    @querySelector('.message').textContent = @message()
    @querySelector('.avatar img').src = History.authorAvatar(@commit.author().email())

    description = @description()
    if description
      @querySelector('.description').textContent = @description()

  message: ->
    @commit.message().split("\n")[0]

  description: ->
    lines = @commit.message().split("\n")
    main = lines.shift()

    lines.join("\n").replace(/^\n+|\n+$/, '')

module.exports = document.registerElement 'commit-header-view', prototype: CommitHeaderView.prototype
