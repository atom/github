GitChanges = require './git-changes'

module.exports = class Changes
  # The view-model for the root ChangesView
  constructor: ->
    @git = new GitChanges
