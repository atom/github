$         = require 'jquery'
PatchView = require './patch-view'

DefaultFontFamily = "Inconsolata, Monaco, Consolas, 'Courier New', Courier"
DefaultFontSize = 14

class DiffView extends HTMLElement
  createdCallback: ->
    @el = $(@)
    @tabIndex = -1
    @setFont()

  attachedCallback: ->
    @base = @el.closest('git-experiment-repository-view')
    @handleEvents()

  handleEvents: ->
    @base.on 'render-patch', @renderPatch.bind(@)
    atom.config.onDidChange 'editor.fontFamily', @setFont.bind(@)
    atom.config.onDidChange 'editor.fontSize', @setFont.bind(@)

  setFont: ->
    fontFamily = atom.config.get('editor.fontFamily') or DefaultFontFamily
    fontSize   = atom.config.get('editor.fontSize') or DefaultFontSize
    @style.fontFamily = fontFamily
    @style.fontSize   = "#{fontSize}px"

  renderPatch: (e, entry, patch) ->
    @innerHTML = ''
    patchView  = new PatchView

    patchView.setPatch(patch, entry.status)
    @appendChild(patchView)


module.exports = document.registerElement 'git-experiment-diff-view',
  prototype: DiffView.prototype
