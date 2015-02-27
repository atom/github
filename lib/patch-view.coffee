$          = require 'jquery'
HunkView   = require './hunk-view'

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

  attachedCallback: ->
    @base = @el.closest('git-experiment-repository-view')

  setPatch: (@patch, @status) ->
    @fileNode.textContent = @patch.newFile().path()
    for hunk, idx in @patch.hunks()
      hunkView = new HunkView
      hunkView.setHunk(@patch, idx, @status)
      @hunksNode.appendChild(hunkView)

module.exports = document.registerElement 'git-experiment-patch-view',
  prototype: PatchView.prototype
