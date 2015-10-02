Highlights = require 'highlights'
Patch = require './patch.coffee'
observe = require '../observe'

# /--TODO remove-
HunkView = require './hunk-view.coffee'
$ = require 'jquery'
# --------------/

PatchTemplate = """
<div class="patch-description">
  <span class="status-icon"></span>
  <span class="text"></span>
</div>
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

AddedTemplate = """
<div class="patch-description">
  <span class="icon-diff-added status-added"></span>
  <span class="text">
    Added <strong class="path"></strong>
  </span>
</div>
"""

RemovedTemplate = """
<div class="patch-description">
  <span class="icon-diff-removed status-removed"></span>
  <span class="text">
    Removed <strong class="path"></strong>
  </span>
</div>
"""

ModifiedTemplate = """
<div class="patch-description">
  <span class="icon-diff-modified status-modified"></span>
  <span class="text">
    <strong class="path"></strong>
  </span>
</div>
"""

EmptyTemplate = """
<div class="empty">No content changes</div>
"""

class PatchElement extends HTMLElement
  initialize: ({@changesView, patch}) ->
    @model = patch
    @gitIndex = @changesView.model.gitIndex
    observe @model, [], @update.bind(this)
    @update()

  createdCallback: ->
    @innerHTML = PatchTemplate

  attachedCallback: ->

  update: ->
    @path = @model.patch.newFile().path()
    @addHeaders()

    @model.patch.hunks().then (hunks) =>
      for hunk, idx in hunks
        hunkView = new HunkView
        hunkView.initialize(gitIndex: @gitIndex)
        hunkView.setHunk(@model.patch, idx, @model.status)
        @appendChild(hunkView)

    @addEmpty() unless @model.patch.size() > 0

    @setSyntaxHighlights()

  hunkViews: ->
    @querySelectorAll("git-hunk-view")

  clearSelections: ->
    hunk.unselectAllChangedLines() for hunk in @hunkViews()

  setSyntaxHighlights: ->
    @gitIndex.getBlobs
      patch: @model.patch
      status: @model.status
      commit: @model.commit
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
    if @model.patch.isRenamed()
      @addRenamedHeader()
    else
      node = if @model.patch.isAdded() or @model.patch.isUntracked()
        $(AddedTemplate)[0]
      else if @model.patch.isDeleted()
        $(RemovedTemplate)[0]
      else
        $(ModifiedTemplate)[0]

      path     = @model.patch.newFile().path()
      pathNode = node.querySelector('.path')
      pathNode.textContent = path
      @appendChild(node)

  addRenamedHeader: ->
    node     = $(RenamedTemplate)[0]
    from     = @model.patch.oldFile().path()
    to       = @model.patch.newFile().path()
    fromNode = node.querySelector('.from')
    toNode   = node.querySelector('.to')

    fromNode.textContent = from
    toNode.textContent = to

    @appendChild(node)

  addEmpty: ->
    @insertAdjacentHTML('beforeend', EmptyTemplate)

module.exports = document.registerElement 'git-patch',
  prototype: PatchElement.prototype
