# Diff
# ====
#
# This is the viewmodel for DiffElement. I'm not entirely sure the best way to
# refactor that element, see its comment block.

module.exports = class Diff
  constructor: ({@gitIndex, @filePath}) ->

  getPatch: ->
    @gitIndex.getStatuses().then =>
      @gitIndex.getPatch(@filePath, 'unstaged')
    .then (patch) =>
      entry:
        path: @filePath
        status: 'unstaged'
      patch: patch
