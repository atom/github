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

  update: ->
    @git.getBranch().then (name) =>
      @branchNameNode.textContent = name

    @git.walkHistory()
    .then (oids) =>
      for oid in oids
        commitSummaryView = new CommitSummaryView
        commitSummaryView.setId(oid)
        @commitsNode.appendChild(commitSummaryView)

module.exports = document.registerElement 'git-experiment-commit-list-view',
  prototype: CommitListView.prototype
