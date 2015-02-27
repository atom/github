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
    @path = @patch.newFile().path()
    @fileNode.textContent = @path
    for hunk in @getHunks()
      @hunksNode.appendChild(hunk)

  getHunks: ->
    @constructor.hunkCache or= {}
    @constructor.hunkCache["#{@status}#{@path}"] or= @createHunks()

  createHunks: ->
    hunks = []

    for hunk, idx in @patch.hunks()
      hunkView = new HunkView
      hunkView.setHunk(@patch, idx, @status)
      hunks.push(hunkView)

    @setSyntaxHighlights()

    hunks

  clearCache: ->
    console.log 'clearing cache'
    @constructor.hunkCache = {}

  hunkViews: ->
    @querySelectorAll("git-experiment-hunk-view")

  setSyntaxHighlights: ->
    @git.getBlobs(@patch, @status).then (blobs) =>
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
