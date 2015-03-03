$ = require 'jquery'
GitHistory = require './git-history'

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
    @innerHTML = BaseTemplate
    @branchNameNode = @querySelector('.branch-name')

    @git = new GitHistory

  update: ->
    @git.getBranch().then (name) =>
      @branchNameNode.textContent = name

    @git.walkHistory()
    .then (oids) ->
      console.log oids

module.exports = document.registerElement 'git-experiment-commit-list-view',
  prototype: CommitListView.prototype
