$ = require 'jquery'
GitHistory = require './git-history'
CommitSummaryView = require './commit-summary-view'

BaseTemplate = """
<div class="column-header">
  <span class="icon icon-git-branch"></span>
  <span class="branch-name"></span>
</div>
<div class="scroller"></div>
"""

class CommitListView extends HTMLElement
  createdCallback: ->
    @el = $(@)
    @innerHTML      = BaseTemplate
    @branchNameNode = @querySelector('.branch-name')
    @commitsNode    = @querySelector('.scroller')

    @git = new GitHistory

    @handleEvents()

  handleEvents: ->
    @el.on 'click', '.btn-load-more', @loadMoreCommits.bind(@)

  update: ->
    @git.getBranch().then (name) =>
      @branchNameNode.textContent = name

    @git.walkHistory()
    .then (oids) =>
      @commitsNode.innerHTML = ''
      @addCommitSummaries(oids)

  addCommitSummaries: (oids) ->
    @removeLoadMoreButton()

    commitPromises = []

    for oid in oids
      commitSummaryView = new CommitSummaryView
      commitPromises.push(commitSummaryView.setId(oid))
      @commitsNode.appendChild(commitSummaryView)

    Promise.all(commitPromises).then =>
      @addLoadMoreButton()

  removeLoadMoreButton: ->
    button = @commitsNode.querySelector('.btn')
    @commitsNode.removeChild(button) if button

  addLoadMoreButton: ->
    last = @commitsNode.querySelector('git-experiment-commit-summary-view:last-child')
    parent = last.dataset.parent
    base = @git.currentBase?.toString()
    if parent != base
      button = document.createElement('button')
      button.classList.add('btn')
      button.classList.add('btn-load-more')
      button.dataset.sha = parent
      button.textContent = "Load more commits"
      button.tabIndex = -1
      @commitsNode.appendChild(button)

  loadMoreCommits: (e) ->
    sha = e.currentTarget.dataset.sha
    @git.walkHistory(sha)
    .then (oids) =>
      @removeLoadMoreButton()
      @addCommitSummaries(oids)

module.exports = document.registerElement 'git-experiment-commit-list-view',
  prototype: CommitListView.prototype
