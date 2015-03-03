$ = require 'jquery'
GitHistory = require './git-history'

class CommitDetailsView extends HTMLElement
  createdCallback: ->
    @git = new GitHistory

module.exports = document.registerElement 'git-experiment-commit-details-view',
  prototype: CommitDetailsView.prototype
