TemplateHelper = require './template-helper'
GitHistory = require './git-history'
PatchView = require './patch-view'

BaseTemplate = """
  <div class="history"></div>
  <div class="diffs"></div>
"""

CommitSummaryTemplateString = """
  <div class="commit">
    <div class="sha"></div>
    <div class="author"></div>
    <div class="message"></div>
  </div>
"""

class HistoryView extends HTMLElement
  createdCallback: ->
    window.diffsView = this

    @history = new GitHistory()

    @innerHTML = BaseTemplate
    @historyNode = @querySelector('.history')
    @diffsNode = @querySelector('.diffs')

    @historyNode.addEventListener 'click', (e) =>
      commitNode = e.target
      while commitNode? && !commitNode.classList?.contains('commit')
        commitNode = commitNode.parentNode
      if commitNode?
        sha = commitNode.querySelector('.sha').textContent
        @renderCommitDetail(sha)

    @commitTemplate = TemplateHelper.addTemplate(this, CommitSummaryTemplateString)

    @renderHistory().catch (error) ->
      console.error error.message, error
      console.error error.stack

  getTitle: ->
    'Git History View'

  renderHistory: ->
    new Promise (resolve, reject) =>
      @history.walkHistory (commit) =>
        promise = @renderCommitSummary(commit)
        resolve(commit)
        promise
    .then (firstCommit) =>
      @renderCommitDetail(firstCommit.sha())

  renderCommitSummary: (commit) ->
    # We still dont have a good view framework yet
    commitNode = TemplateHelper.renderTemplate(@commitTemplate)
    commitNode.querySelector('.sha').textContent = commit.sha()
    commitNode.querySelector('.author').textContent = commit.author().name()
    commitNode.querySelector('.message').textContent = commit.message().split('\n')[0]
    commitNode.firstElementChild.id = "sha-#{commit.sha()}"
    @historyNode.appendChild(commitNode)

  renderCommitDetail: (sha) ->
    @diffsNode.innerHTML = ''

    for commitNode in @querySelectorAll('.commit')
      commitNode.classList.remove('selected')
    @querySelector("#sha-#{sha}")?.classList.add('selected')

    commit = @history.getCommit(sha)
    commit.getDiff().then (diffList) =>
      for diff in diffList
        window.diff = diff
        for patch in diff.patches()
          patchView = new PatchView
          patchView.setPatch(patch)
          @diffsNode.appendChild(patchView)

module.exports = document.registerElement 'git-experiment-history-view', prototype: HistoryView.prototype
