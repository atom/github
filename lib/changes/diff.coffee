# Diff
# ====
#
# This is the viewmodel for DiffElement. I'm not entirely sure the best way to
# refactor that element, see its comment block.

module.exports = class Diff
  constructor: ({@git}) ->
