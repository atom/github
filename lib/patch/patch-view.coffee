$          = require 'jquery'
HunkView   = require './hunk-view'
GitChanges = require '../changes/git-changes'
Highlights = require 'highlights'
path       = require 'path'

EmptyTemplate = """
<ul class='background-message centered'>No Change Selected</ul>
"""

RenamedTemplate = """
<div class="patch-description">
  <span class="icon-diff-renamed status-renamed"></span>
  <span class="text">
    Moved from <strong class="from"></strong>
    to <strong class="to"></strong>
  </span>
</div>
"""

EmptyTemplate = """
<div class="empty">No content changes</div>
"""

class PatchView extends HTMLElement
  createdCallback: ->
    @el  = $(@)
    @git = new GitChanges

  attachedCallback: ->
    @base = @el.closest('.git-experiment-root-view')

  setPatch: ({@patch, @status, @commit}) ->
    @path = @patch.newFile().path()
    @addHeaders()
    for hunk, idx in @patch.hunks()
      hunkView = new HunkView
      hunkView.setHunk(@patch, idx, @status)
      @appendChild(hunkView)

    @addEmpty() unless @patch.hunks().length
    @setSyntaxHighlights()

  hunkViews: ->
    @querySelectorAll("git-experiment-hunk-view")

  clearSelections: ->
    hunk.unselectAllChangedLines() for hunk in @hunkViews()

  setSyntaxHighlights: ->
    @git.getBlobs
      patch: @patch
      status: @status
      commit: @commit
    .then (blobs) =>
      if grammar = atom.grammars.selectGrammar(@path, blobs.new)
        highlighter = new Highlights
        highlighter.requireGrammarsSync
          modulePath: grammar.path

        oldSource = highlighter.highlightSync
          fileContents: blobs.old
          scopeName: grammar.scopeName

        newSource = highlighter.highlightSync
          fileContents: blobs.new
          scopeName: grammar.scopeName

        for hunkView in @hunkViews()
          hunkView.setHighlightedSource
            oldSource: $(oldSource)
            newSource: $(newSource)

  addHeaders: ->
    @addRenamedHeader() if @patch.isRenamed()

  addRenamedHeader: ->
    node     = $(RenamedTemplate)[0]
    from     = @patch.oldFile().path()
    to       = @patch.newFile().path()
    fromNode = node.querySelector('.from')
    toNode   = node.querySelector('.to')

    fromNode.textContent = from
    toNode.textContent = to

    @appendChild(node)

  addEmpty: ->
    node = $(EmptyTemplate)[0]
    @appendChild(node)

module.exports = document.registerElement 'git-experiment-patch-view',
  prototype: PatchView.prototype
