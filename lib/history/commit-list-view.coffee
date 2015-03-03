$ = require 'jquery'
GitHistory = require './git-history'

class CommitListView extends HTMLElement
  createdCallback: ->
    @git = new GitHistory

  update: ->
    @git.walkHistory()
    .then (oids) ->
      console.log oids

module.exports = document.registerElement 'git-experiment-commit-list-view',
  prototype: CommitListView.prototype
