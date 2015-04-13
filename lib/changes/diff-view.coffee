$         = require 'jquery'
PatchView = require '../patch/patch-view'
PatchElement = require './patch-element'
Patch = require './patch'

DOMListener = require 'dom-listener'
{CompositeDisposable} = require 'atom'

DefaultFontFamily = "Inconsolata, Monaco, Consolas, 'Courier New', Courier"
DefaultFontSize = 14

EmptyTemplate = """
<ul class='background-message centered'>No Change Selected</ul>
"""

ChangedLineSelector = ".hunk-line.addition, .hunk-line.deletion"

class DiffView extends HTMLElement
  @diffSelectionMode: 'hunk'
  @dragging: false

  initialize: ({@changesView}) ->

  createdCallback: ->
    @el = $(@)
    @tabIndex = -1
    @setFont()
    @empty()
    @disposables = new CompositeDisposable

  attachedCallback: ->
    @base = @el.closest('.git-root-view')
    @handleEvents()

  handleEvents: ->
    # Listen to events from the root view
    # This should probably have an api like @changesView.onDidRenderPatch(fn)
    changesViewListener = new DOMListener(@changesView)
    @disposables.add changesViewListener.add(@changesView, 'render-patch', @renderPatch.bind(@))
    @disposables.add changesViewListener.add(@changesView, 'no-change-selected', @empty.bind(@))
    @disposables.add changesViewListener.add(@changesView, 'focus-diff-view', @focusAndSelect.bind(@))

    # Events here
    listener = new DOMListener(@)
    stopIt = (e) -> e.stopPropagation() if e.target and e.target.classList.contains('.btn')
    @disposables.add listener.add(@, 'mousedown', stopIt)

    @disposables.add atom.config.onDidChange 'editor.fontFamily', @setFont.bind(@)
    @disposables.add atom.config.onDidChange 'editor.fontSize', @setFont.bind(@)
    @disposables.add @changesView.model.git.onDidUpdateRepository(@clearCache.bind(@))

    @disposables.add  atom.commands.add "git-diff-view",
      'core:move-left': @focusList
      'core:move-down': @moveSelectionDown
      'core:move-up': @moveSelectionUp
      'core:confirm': @stageSelectedLines
      'git:toggle-selection-mode': @toggleSelectionMode
      'git:select-active-lines': @selectActiveLines
      'git:expand-selection-down': @expandSelectionDown
      'git:expand-selection-up': @expandSelectionUp
      'git:clear-selections': @clearSelections
      'git:focus-commit-message': @focusCommitMessage
      'git:open-file-to-line': @openFileToLine

    @handlePatchViewEvents(listener)

  handlePatchViewEvents: (listener) ->
    # this stuff belongs on PatchElement maybe?

    @disposables.add listener.add(ChangedLineSelector, 'mouseenter', @mouseEnterLine.bind(@))
    @disposables.add listener.add(ChangedLineSelector, 'mouseleave', @mouseLeaveLine.bind(@))
    @disposables.add listener.add(ChangedLineSelector, 'mousedown', @mouseDownLine.bind(@))

    @disposables.add listener.add(@, 'mouseup', @mouseUp.bind(@))
    @disposables.add listener.add(@, 'mouseleave', @mouseUp.bind(@))

    @disposables.add listener.add('.btn-stage-lines', 'click', @stageLines.bind(@))
    @disposables.add listener.add('.btn-stage-hunk', 'click', @stageHunk.bind(@))

  detachedCallback: ->
    @disposables.dispose()

  setFont: ->
    fontFamily = atom.config.get('editor.fontFamily') or DefaultFontFamily
    fontSize   = atom.config.get('editor.fontSize') or DefaultFontSize
    @style.fontFamily = fontFamily
    @style.fontSize   = "#{fontSize}px"

  getPatchView: (patch, status) ->
    path = patch.newFile().path()
    @constructor.patchCache or= {}
    @constructor.patchCache["#{status}#{path}"] or=
      @createPatchView(patch, status)

  createPatchView: (_patch, status) ->
    patchElement  = new PatchElement
    patch = new Patch(patch: _patch, status: status)
    patchElement.initialize({changesView: @changesView, patch: patch})
    patchElement

  renderPatch: (e) ->
    {patch, entry} = e.detail
    if patch
      currentPatch = @querySelector('git-patch-view')
      patchView = @getPatchView(patch, entry.status)
      if !currentPatch or !currentPatch.isSameNode(patchView)
        @currentScroll = @scrollTop
        @innerHTML = ''
        patchView.clearSelections()
        @appendChild(patchView)
        @setScrollPosition(patchView)

      @currentStatus = entry.status
      @currentPath   = patch.newFile().path()
    else
      @empty()

  setScrollPosition: (patchView)->
    status = patchView.status
    path   = patchView.path
    if @currentStatus == status and @currentPath == path
      @scrollTop = @currentScroll
      @setHunkSelection()
    else
      @scrollTop = 0

  setHunkSelection: ->
    return unless @selectedHunkIndex?
    hunks = @allHunkViews()
    hunk  = hunks[@selectedHunkIndex]
    unless hunk
      hunk = hunks[hunks.length-1]
    @selectHunk(hunk)
    @selectedHunkIndex = null
    @focus()

  empty: ->
    @innerHTML = EmptyTemplate

  focusAndSelect: ->
    @selectFirstHunk() unless @selectedHunk()
    @removeClassFromLines('active')
    @focus()

  focusList: ->
    @changesView.focusList()

  focusCommitMessage: ->
    @base.trigger('focus-commit-message')

  selectedHunk: ->
    line = @querySelector('.hunk-line.selected, .hunk-line.keyboard-active')
    @hunkForLine(line)

  hunkForLine: (line) ->
    $(line).closest('git-hunk-view')[0]

  selectFirstHunk: ->
    @diffSelectionMode = 'hunk'
    hunk = @querySelector('git-hunk-view')
    @selectHunk(hunk)

  clearCache: ->
    @constructor.patchCache = {}

  allHunkViews: ->
    hunks = @querySelectorAll('git-hunk-view')
    hunks

  hunkSelectionMode: ->
    @diffSelectionMode == 'hunk'

  scrollIntoView: (entry) ->
    scrollBottom = @offsetHeight + @scrollTop
    entryTop     = entry.offsetTop
    entryBottom  = entryTop + entry.offsetHeight
    if entryBottom > scrollBottom
      entry.scrollIntoView(entry.offsetHeight > @offsetHeight)
    else if entry.offsetTop < @scrollTop
      entry.scrollIntoView(true)

  unselectAllHunks: ->
    @removeClassFromLines('active')
    @removeClassFromLines('selected')
    @removeClassFromLines('selection-point')
    @removeClassFromLines('keyboard-active')
    @removeClassFromLines('keyboard-selection-start')

  clearSelections: ->
    @removeClassFromLines('selected')

  selectHunk: (hunk) ->
    return unless hunk? and hunk.tagName == 'GIT-HUNK-VIEW'
    @diffSelectionMode = 'hunk'
    @unselectAllHunks()
    @scrollIntoView(hunk)
    hunk.selectAllChangedLines()

  selectNextHunk: ->
    @selectHunk(@selectedHunk()?.nextElementSibling)

  selectPreviousHunk: ->
    @selectHunk(@selectedHunk()?.previousElementSibling)

  moveSelectionDown: (e) ->
    if @hunkSelectionMode()
      @selectNextHunk()
    else
      if e.shiftKey
        @expandLineSelectionDown()
      else
        @selectNextLine()

  moveSelectionUp: (e) ->
    if @hunkSelectionMode()
      @selectPreviousHunk()
    else
      if e.shiftKey
        @expandLineSelectionUp()
      else
        @selectPreviousLine()

  selectNextLine: ->
    active = @selectedHunk().querySelectorAll('.keyboard-active')
    selection = active[active.length - 1]
    if selection
      next = $(selection).nextAll(ChangedLineSelector)[0] #or selection
      if next
        @removeClassFromLines('keyboard-active')
        @removeClassFromLines('keyboard-selection-start')
        next.classList.add('keyboard-active')
        next.classList.add('keyboard-selection-start')
        @scrollIntoView(next)
    else
      @toggleSelectionMode()

  selectPreviousLine: ->
    selection = @selectedHunk().querySelector('.keyboard-active')
    if selection
      previous = $(selection).prevAll(ChangedLineSelector)[0] #or selection
      if previous
        @removeClassFromLines('keyboard-active')
        @removeClassFromLines('keyboard-selection-start')
        previous.classList.add('keyboard-active')
        previous.classList.add('keyboard-selection-start')
        @scrollIntoView(previous)
    else
      @toggleSelectionMode()

  expandSelectionDown: ->
    start       = @querySelector('.keyboard-selection-start')
    activeLines = @querySelectorAll('.keyboard-active')
    firstActive = activeLines[0]
    lastActive  = activeLines[activeLines.length - 1]
    if firstActive.classList.contains('keyboard-selection-start')
      next = $(lastActive).nextAll(ChangedLineSelector)[0]
      next?.classList.add('keyboard-active')
    else
      firstActive.classList.remove('keyboard-active')

  expandSelectionUp: ->
    start = @querySelector('.keyboard-selection-start')
    activeLines = @querySelectorAll('.keyboard-active')
    firstActive = activeLines[0]
    lastActive  = activeLines[activeLines.length - 1]
    if lastActive.classList.contains('keyboard-selection-start')
      previous = $(firstActive).prevAll(ChangedLineSelector)[0]
      previous?.classList.add('keyboard-active')
    else
      lastActive.classList.remove('keyboard-active')

  mouseEnterLine: (e) ->
    e.currentTarget.classList.add('active')
    @processLineSelection(e.currentTarget) if @dragging

  mouseLeaveLine: (e) ->
    e.currentTarget.classList.remove('active')

  mouseDownLine: (e) ->
    @dragging = true
    line = e.currentTarget
    @unselectAllHunks() if !e.shiftKey and !e.ctrlKey and !e.metaKey
    @selectHunkLine(line) if !e.shiftKey

  mouseUp: (e) ->
    @dragging = false
    line = $(e.target).closest(ChangedLineSelector)[0]
    return unless line
    if e.shiftKey
      @processLineSelection(line)
    else
      @removeClassFromLines('dragging')
      @removeClassFromLines('dragged')

  selectHunkLine: (line) ->
    hunk = @hunkForLine(line)
    @unselectAllHunks() unless hunk.isSameNode(@selectedHunk())
    @removeClassFromLines('selection-point')
    line.classList.add('selection-point')
    line.classList.toggle('selected')

  removeClassFromLines: (className) ->
    lines = @querySelectorAll(".hunk-line.#{className}")
    line.classList.remove(className) for line in lines
    lines

  processLineSelection: (line) ->
    hunk = @hunkForLine(line)
    start = hunk.querySelector('.selection-point')
    return unless start

    startIndex = start.dataset.lineIndex
    lineIndex  = line.dataset.lineIndex
    selected   = false

    for row in hunk.querySelectorAll(ChangedLineSelector)
      rowIndex = row.dataset.lineIndex
      foundLimit = rowIndex == lineIndex or rowIndex == startIndex
      if foundLimit or select
        if @dragging
          row.classList.add('dragging')
          row.classList.remove('dragged')

        if start.classList.contains('selected')
          row.classList.add('selected')
        else
          row.classList.remove('selected')

        if lineIndex == startIndex
          select = false
        else if foundLimit
          select = !select

    dragged = @removeClassFromLines('dragged')

    if @dragging
      if start.classList.contains('selected')
        line.classList.remove('selected') for line in dragged
      else
        line.classList.add('selected') for line in dragged

      draggingLines = @removeClassFromLines('dragging')
      line.classList.add('dragged') for line in draggingLines

  toggleSelectionMode: ->
    activeHunk = @selectedHunk()
    @unselectAllHunks()
    switch @diffSelectionMode
      when 'hunk'
        @diffSelectionMode = 'line'
        line = activeHunk.querySelector(ChangedLineSelector)
        line.classList.add('keyboard-active')
        line.classList.add('keyboard-selection-start')
      when 'line'
        @diffSelectionMode = 'hunk'
        @selectHunk(activeHunk)

  selectActiveLines: ->
    return if @hunkSelectionMode()
    lines = @querySelectorAll('.keyboard-active')
    selected = lines[0].classList.contains('selected')
    for line in lines
      if selected
        line.classList.remove('selected')
      else
        line.classList.add('selected')

  stageSelectedLines: ->
    hunk = @selectedHunk()
    @selectedHunkIndex = hunk?.index
    hunk?.processLinesStage()

  stageHunk: (e) ->
    e.stopImmediatePropagation()
    hunk = $(e.currentTarget).closest('git-hunk-view')[0]
    hunk?.selectAllChangedLines()
    hunk?.processLinesStage()

  stageLines: (e) ->
    e.stopImmediatePropagation()
    hunk = $(e.currentTarget).closest('git-hunk-view')[0]
    hunk?.processLinesStage()

  openFileToLine: ->
    hunk = @selectedHunk()
    line = hunk?.activeLine()
    return unless line
    path = hunk.patch.newFile().path()
    atom.workspace.open path,
      initialLine: line.dataset.newIndex

module.exports = document.registerElement 'git-diff-view',
  prototype: DiffView.prototype
