# DiffElement <git-diff-view>
# ===========================
#
# This element has the most complex behaviors of all of ChangesElement's
# children. It's probably ripe for a refactoring. I'm not sure the best way to
# decompose it - I could follow the pattern of the other prototype views and just
# split out some functionality to a model and write tests, but it might make more
# sense to split it into multiple views...
#
# DiffElement is the container for the right half of "View and Commit Changes".
# When you select something from the list of statuses on the left, DiffElement
# is updated with a diff that has a set of patches and hunks that can be
# interacted with to stage and unstage

$         = require 'jquery'

Diff = require './diff'

PatchElement = require '../patch/patch-element'
Patch = require '../patch/patch'

DOMListener = require 'dom-listener'
{CompositeDisposable} = require 'atom'

DefaultFontFamily = "Inconsolata, Monaco, Consolas, 'Courier New', Courier"
DefaultFontSize = 14

EmptyTemplate = """
<ul class='background-message centered'>No Change Selected</ul>
"""

ChangedLineSelector = ".hunk-line.addition, .hunk-line.deletion"


# XXX These are temporary helpers that can probably be removed when we aren't
# traversing the dom to get ahold of models anymore.

closest = (element, matchFn) ->
  while element
    return element if matchFn(element)
    element = element.parentNode

closestSelector = (element, selector) ->
  closest element, (elt) ->
    elt.matches?(selector)

class DiffElement extends HTMLElement
  initialize: ({@gitIndex, @model}) ->
    @diffSelectionMode = 'hunk'
    @dragging = false

    console.log 'init', @model

  createdCallback: ->
    @tabIndex = -1
    @setFont()
    @empty()
    @disposables = new CompositeDisposable

  attachedCallback: ->
    @handleEvents()

    console.log 'attached', @model
    @model.getPatch().then (patch) =>
      console.log 'have patch', patch
      @renderPatch(patch)

  handleEvents: ->
    # Listen to events from the root view
    # This should probably have an api like @changesView.onDidRenderPatch(fn)
    # TODO: push these events down into the model if possible
    # changesViewListener = new DOMListener(@changesView)
    # @disposables.add changesViewListener.add(@changesView, 'render-patch', @renderPatch.bind(this))
    # @disposables.add changesViewListener.add(@changesView, 'no-change-selected', @empty.bind(this))
    # @disposables.add changesViewListener.add(@changesView, 'focus-diff-view', @focusAndSelect.bind(this))

    # This view's DOM events
    listener = new DOMListener(this)
    stopIt = (e) -> e.stopPropagation() if e.target and e.target.classList.contains('.btn')
    @disposables.add listener.add(this, 'mousedown', stopIt)

    @disposables.add atom.config.onDidChange 'editor.fontFamily', @setFont.bind(this)
    @disposables.add atom.config.onDidChange 'editor.fontSize', @setFont.bind(this)
    @disposables.add @gitIndex.onDidUpdateRepository(@clearCache.bind(this))

    @disposables.add  atom.commands.add "git-diff-view",
      # 'core:move-left': @changesView.focusList.bind(@changesView)
      'core:move-down': @moveSelectionDown
      'core:move-up': @moveSelectionUp
      'core:confirm': @stageSelectedLines
      'git:toggle-selection-mode': @toggleSelectionMode
      'git:select-active-lines': @selectActiveLines
      'git:expand-selection-down': @expandSelectionDown
      'git:expand-selection-up': @expandSelectionUp
      'git:clear-selections': @clearSelections
      # 'git:focus-commit-message': @changesView.focusCommitMessage.bind(@changesView)
      'git:open-file-to-line': @openFileToLine

    @handlePatchElementEvents(listener)

  handlePatchElementEvents: (listener) ->
    # this stuff belongs on PatchElement maybe?

    @disposables.add listener.add(ChangedLineSelector, 'mouseenter', @mouseEnterLine.bind(this))
    @disposables.add listener.add(ChangedLineSelector, 'mouseleave', @mouseLeaveLine.bind(this))
    # This next line is causing an illegal invocation for some reason
    @disposables.add listener.add(ChangedLineSelector, 'mousedown', @mouseDownLine.bind(this))

    @disposables.add listener.add(this, 'mouseup', @mouseUp.bind(this))
    @disposables.add listener.add(this, 'mouseleave', @mouseUp.bind(this))

    @disposables.add listener.add('.btn-stage-lines', 'click', @stageLines.bind(this))
    @disposables.add listener.add('.btn-stage-hunk', 'click', @stageHunk.bind(this))

  detachedCallback: ->
    @disposables.dispose()

  setFont: ->
    fontFamily = atom.config.get('editor.fontFamily') or DefaultFontFamily
    fontSize   = atom.config.get('editor.fontSize') or DefaultFontSize
    @style.fontFamily = fontFamily
    @style.fontSize   = "#{fontSize}px"

  # I'm not sure exactly the best way to organize / refactor this stuff
  # (`getPatchElement`, `createPatchElement`, `renderPatch`, `setScrollPosition`,
  # `setHunkSelection`) in light of viewmodels


  getPatchElement: (patch, status) ->
    path = patch.newFile().path()
    @constructor.patchCache or= {}
    @constructor.patchCache["#{status}#{path}"] or=
      @createPatchElement(patch, status)

  createPatchElement: (_patch, status) ->
    patchElement  = new PatchElement
    patch = new Patch(patch: _patch, status: status)
    patchElement.initialize({@gitIndex, patch})
    patchElement

  renderPatch: ({patch, entry}) ->
    if patch
      currentPatch = @querySelector('git-patch-view, git-patch')
      patchView = @getPatchElement(patch, entry.status)
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

  setScrollPosition: (patchView) ->
    status = patchView.model.status
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

  selectedHunk: ->
    # XXX this shouldn't be traversing the DOM, the selected state should live
    # on the hunk model
    line = @querySelector('.hunk-line.selected, .hunk-line.keyboard-active')
    @closestHunkForElement(line)

  closestHunkForElement: (line) ->
    closest line, (elt) -> elt.tagName == 'GIT-HUNK-VIEW'

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
    active = @selectedHunk()?.querySelectorAll('.keyboard-active')
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
    line = closestSelector(e.target, ChangedLineSelector)
    return unless line
    if e.shiftKey
      @processLineSelection(line)
    else
      @removeClassFromLines('dragging')
      @removeClassFromLines('dragged')

  selectHunkLine: (line) ->
    hunk = @closestHunkForElement(line)
    @unselectAllHunks() unless hunk.isSameNode(@selectedHunk())
    @removeClassFromLines('selection-point')
    line.classList.add('selection-point')
    line.classList.toggle('selected')

  removeClassFromLines: (className) ->
    lines = @querySelectorAll(".hunk-line.#{className}")
    line.classList.remove(className) for line in lines
    lines

  processLineSelection: (line) ->
    hunk = @closestHunkForElement(line)
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
    hunk = @closestHunkForElement(e.currentTarget)
    hunk?.selectAllChangedLines()
    hunk?.processLinesStage()

  stageLines: (e) ->
    e.stopImmediatePropagation()
    hunk = @closestHunkForElement(e.currentTarget)
    hunk?.processLinesStage()

  openFileToLine: ->
    hunk = @selectedHunk()
    line = hunk?.activeLine()
    return unless line
    path = hunk.patch.newFile().path()
    atom.workspace.open path,
      initialLine: line.dataset.newIndex

module.exports = document.registerElement 'git-diff-view',
  prototype: DiffElement.prototype
