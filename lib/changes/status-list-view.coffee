$                 = require 'jquery'
GitChanges        = require './git-changes'
CommitMessageView = require './commit-message-view'
UndoCommitView    = require './undo-commit-view'
FileSummaryView   = require './file-summary-view'

BaseTemplate = """
<div class="unstaged column-header">Unstaged changes
  <button class="btn btn-xs btn-stage-all">Stage all</button>
</div>
<div class="unstaged files"></div>
<div class="staged column-header">Staged changes
  <button class="btn btn-xs btn-unstage-all">Unstage all</button>
</div>
<div class="staged files"></div>
<div class="staged column-header">Commit message</div>
<div class="commit-message-box"></div>
<div class="undo-last-commit-box"></div>
"""

FileSummaryTag = "git-experiment-file-summary-view"

class StatusListView extends HTMLElement
  createdCallback: ->
    # Elements
    @el               = $(@)
    @innerHTML        = BaseTemplate
    @tabIndex         = -1
    @stagedNode       = @querySelector(".files.staged")
    @unstagedNode     = @querySelector(".files.unstaged")
    @commitMessageBox = @querySelector(".commit-message-box")
    @undoCommitBox    = @querySelector(".undo-last-commit-box")

    @git = new GitChanges

    # Subviews
    @commitMessageView = new CommitMessageView
    @commitMessageBox.appendChild(@commitMessageView)

    @undoCommitView = new UndoCommitView
    @undoCommitBox.appendChild(@undoCommitView)

  attachedCallback: ->
    @base = @el.closest('.git-experiment-root-view')
    @handleEvents()

  handleEvents: =>
    @base.on "focus-list", @focus.bind(@)
    @base.on "index-updated", @update.bind(@)
    @base.on "focus-commit-message", @focusCommitMessage.bind(@)

    @el.on "click", ".btn-stage-all", @stageAll.bind(@)
    @el.on "click", ".btn-unstage-all", @unstageAll.bind(@)
    @el.on "click", FileSummaryTag, @entryClicked.bind(@)

    atom.commands.add "git-experiment-status-list-view",
      'core:move-down':  @moveSelectionDown
      'core:move-up':    @moveSelectionUp
      'core:move-right': @focusDiffView
      'core:confirm':    @stageSelection
      'git-experiment:focus-commit-message': @focusCommitMessage

  update: ->
    @git.getStatuses()
    .then (statuses) =>
      @stagedNode.innerHTML = ''
      @unstagedNode.innerHTML = ''

      for status in statuses
        # a status can indicate a file that has both
        # staged and unstaged changes, so we need to
        # create two elements if that's the case

        if @isUnstaged(status)
          unstagedSummary = new FileSummaryView
          unstagedSummary.setFile(status, "unstaged")
          @unstagedNode.appendChild(unstagedSummary)
        if @isStaged(status)
          stagedSummary = new FileSummaryView
          stagedSummary.setFile(status, "staged")
          @stagedNode.appendChild(stagedSummary)

      @commitMessageView.setStagedCount(@getStagedEntries().length)
      @undoCommitView.update()
      @setIndices()
      @selectDefaultStatus()
      @focus()

  setIndices: ->
    for entry, idx in @getAllEntries()
      entry.index = idx

  isUnstaged: (status) ->
    bit = status.statusBit()
    codes = @git.statusCodes()

    return bit & codes.WT_NEW ||
           bit & codes.WT_MODIFIED ||
           bit & codes.WT_DELETED ||
           bit & codes.WT_RENAMED ||
           bit & codes.WT_TYPECHANGE

  isStaged: (status) ->
    bit = status.statusBit()
    codes = @git.statusCodes()

    return bit & codes.INDEX_NEW ||
           bit & codes.INDEX_MODIFIED ||
           bit & codes.INDEX_DELETED ||
           bit & codes.INDEX_RENAMED ||
           bit & codes.INDEX_TYPECHANGE

  empty: ->
    @base.trigger("no-change-selected")

  focusDiffView: ->
    @base.trigger('focus-diff-view')

  selectDefaultStatus: ->
    entries = @getAllEntries()
    for entry in entries
      if entry.path == @selectedPath and entry.status == @selectedStatus
        entry.click()
        return
    if entry = entries[@selectedIndex] || entries[@selectedIndex-1]
      entry.click()
      return

    entries[0]?.click() or @empty()

  selectedEntry: ->
    @querySelector(".selected")

  selectEntry: (entry) ->
    return unless entry?

    @selectedPath   = entry.path
    @selectedStatus = entry.status
    @selectedIndex  = entry.index

    selectedEntries = @getSelectedEntries()
    @deselect(selectedEntries)
    entry.classList.add("selected")

    @git.getPatch(entry.path, entry.status).then (patch) =>
      @base.trigger('render-patch', [entry, patch])

    @scrollIntoView(entry)
    entry

  stageSelection: ->
    @selectedEntry()?.stage()

  getAllEntries: ->
    @querySelectorAll(FileSummaryTag)

  getUnstagedEntries: ->
    @unstagedNode.querySelectorAll(FileSummaryTag)

  getStagedEntries: ->
    @stagedNode.querySelectorAll(FileSummaryTag)

  getSelectedEntries: ->
    @querySelectorAll(".selected")

  deselect: (elementsToDeselect=@getSelectedEntries()) ->
    selected.classList.remove("selected") for selected in elementsToDeselect
    undefined

  entryClicked: (e) ->
    entry = e.currentTarget
    @selectEntry(entry)

    false

  focusCommitMessage: =>
    @commitMessageView.focusTextArea()

  scrollIntoView: (entry) ->
    container    = $(entry).closest('.files')[0]
    scrollBottom = container.offsetHeight + container.scrollTop
    entryTop     = entry.offsetTop
    if scrollBottom - entryTop < 0
      entry.scrollIntoView(false)
    else if entry.offsetTop - entry.offsetHeight < container.scrollTop
      entry.scrollIntoView()

  moveSelectionUp: =>
    selected = @selectedEntry()
    prev = selected.previousElementSibling
    unless prev
      if selected.status == 'staged'
        prev = @querySelector(".unstaged #{FileSummaryTag}:last-of-type")
    prev?.click()

  moveSelectionDown: =>
    selected = @selectedEntry()
    next = selected.nextElementSibling
    unless next
      if selected.status == 'unstaged'
        next = @querySelector(".staged #{FileSummaryTag}")
    next?.click()

  stageAll: ->
    paths = []
    paths.push entry.path for entry in @getUnstagedEntries()
    @git.stageAllPaths(paths).then => @base.trigger("index-updated")

  unstageAll: ->
    paths = []
    paths.push entry.path for entry in @getStagedEntries()
    @git.unstageAllPaths(paths).then => @base.trigger("index-updated")

module.exports = document.registerElement "git-experiment-status-list-view",
  prototype: StatusListView.prototype
