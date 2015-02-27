$         = require 'jquery'
PatchView = require './patch-view'

DefaultFontFamily = "Inconsolata, Monaco, Consolas, 'Courier New', Courier"
DefaultFontSize = 14

EmptyTemplate = """
<ul class='background-message centered'>No Change Selected</ul>
"""

class DiffView extends HTMLElement
  @diffSelectionMode: 'hunk'

  createdCallback: ->
    @el = $(@)
    @tabIndex = -1
    @setFont()
    @empty()

  attachedCallback: ->
    @base = @el.closest('git-experiment-repository-view')
    @handleEvents()

  handleEvents: ->
    @base.on 'render-patch', @renderPatch.bind(@)
    @base.on 'no-change-selected', @empty.bind(@)
    @base.on 'focus-diff-view', @focusAndSelect.bind(@)
    @base.on 'index-updated', @clearHunkCache.bind(@)

    atom.config.onDidChange 'editor.fontFamily', @setFont.bind(@)
    atom.config.onDidChange 'editor.fontSize', @setFont.bind(@)

    atom.commands.add "git-experiment-diff-view",
      'core:move-left':  @focusList

  setFont: ->
    fontFamily = atom.config.get('editor.fontFamily') or DefaultFontFamily
    fontSize   = atom.config.get('editor.fontSize') or DefaultFontSize
    @style.fontFamily = fontFamily
    @style.fontSize   = "#{fontSize}px"

  renderPatch: (e, entry, patch) ->
    @innerHTML = ''
    if patch
      patchView  = new PatchView
      patchView.setPatch(patch, entry.status)
      @appendChild(patchView)
    else
      @empty()

  empty: ->
    @innerHTML = EmptyTemplate

  focusAndSelect: ->
    @focus()

  focusList: ->
    @base.trigger('focus-list')
    @selectFirstHunk() unless @selectedElements()

  selectedElements: ->
    @querySelector('.hunk-line.selected')

  clearHunkCache: ->
    @querySelector('git-experiment-patch-view')?.clearCache()


module.exports = document.registerElement 'git-experiment-diff-view',
  prototype: DiffView.prototype
