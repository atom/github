$          = require 'jquery'
HunkView   = require './hunk-view'
GitChanges = require './git-changes'
Highlights = require 'highlights'
path       = require 'path'

BaseTemplate = """
  <div class="diff-file"></div>
  <div class="diff-hunks"></div>
"""

class PatchView extends HTMLElement
  createdCallback: ->
    @el        = $(@)
    @innerHTML = BaseTemplate
    @fileNode  = @querySelector('.diff-file')
    @hunksNode = @querySelector('.diff-hunks')

    @git = new GitChanges

  attachedCallback: ->
    @base = @el.closest('git-experiment-repository-view')

  setPatch: (@patch, @status) ->
    @git.getBlobs(@patch).then (blobs) =>
      path = @patch.newFile().path()
      grammar = atom.grammars.selectGrammar(path, blobs[1])

      @fileNode.textContent = path

      if grammar
        highlighter = new Highlights
        highlighter.requireGrammarsSync
          modulePath: grammar.path

        oldSource = highlighter.highlightSync
          fileContents: blobs.old
          scopeName: grammar.scopeName

        newSource = highlighter.highlightSync
          fileContents: blobs.new
          scopeName: grammar.scopeName

      for hunk, idx in @patch.hunks()
        hunkView = new HunkView
        if grammar
          hunkView.setHighlightedSource
            oldSource: $(oldSource)
            newSource: $(newSource)
        hunkView.setHunk(@patch, idx, @status)
        @hunksNode.appendChild(hunkView)

module.exports = document.registerElement 'git-experiment-patch-view',
  prototype: PatchView.prototype
