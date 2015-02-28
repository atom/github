$          = require 'jquery'
HunkView   = require './hunk-view'
GitChanges = require './git-changes'
Highlights = require 'highlights'
path       = require 'path'

class PatchView extends HTMLElement
  createdCallback: ->
    @el  = $(@)
    @git = new GitChanges

  attachedCallback: ->
    @base = @el.closest('git-experiment-repository-view')

  setPatch: ({@patch, @status, @commit}) ->
    @path = @patch.newFile().path()
    for hunk, idx in @patch.hunks()
      hunkView = new HunkView
      hunkView.setHunk(@patch, idx, @status)
      @appendChild(hunkView)

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

module.exports = document.registerElement 'git-experiment-patch-view',
  prototype: PatchView.prototype
