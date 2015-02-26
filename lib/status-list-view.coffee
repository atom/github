$                 = require 'jquery'
GitChanges        = require './git-changes'
CommitMessageView = require './commit-message-view'
UndoCommitView    = require './undo-commit-view'
FileSummaryView   = require './file-summary-view'

BaseTemplate = """
<div class="unstaged column-header">Unstaged changes
  <button class="btn btn-xs">Stage all</button>
</div>
<div class="unstaged files"></div>
<div class="staged column-header">Staged changes
  <button class="btn btn-xs">Unstage all</button>
</div>
<div class="staged files"></div>
<div class="staged column-header">Commit message</div>
<div class="commit-message-box"></div>
<div class="undo-last-commit-box"></div>
"""

class StatusListView extends HTMLElement
  initialize: (@repositoryView) ->

  createdCallback: ->
    # Elements
    @el               = $(@)
    @innerHTML        = BaseTemplate
    @tabIndex         = -1
    @stagedNode       = @querySelector(".files.staged")
    @unstagedNode     = @querySelector(".files.unstaged")
    @commitMessageBox = @querySelector(".commit-message-box")
    @undoCommitBox    = @querySelector(".undo-last-commit-box")

    @git = new GitChanges()

    # Subviews
    @commitMessageView = new CommitMessageView()
    @commitMessageView.initialize(@)
    @commitMessageBox.appendChild(@commitMessageView)

    @undoCommitView = new UndoCommitView()
    @undoCommitBox.appendChild(@undoCommitView)

    @handleEvents()

  handleEvents: =>
    @el.on "click", "git-experiment-file-summary-view", @entryClicked.bind(@)
    atom.commands.add "git-experiment-status-list-view",
      'core:move-down': @moveSelectionDown
      'core:move-up': @moveSelectionUp
      'git-experiment:focus-commit-message': @focusCommitMessage

  update: ->
    @git.getStatuses()
    .then (statuses) =>
      @stagedNode.innerHTML = ''
      @unstagedNode.innerHTML = ''

      for status in statuses
        if @isUnstaged(status)
          summary = new FileSummaryView()
          summary.setFile(status, "unstaged")
          @unstagedNode.appendChild(summary)
        if @isStaged(status)
          summary = new FileSummaryView()
          summary.setFile(status, "staged")
          @stagedNode.appendChild(summary)
      @setIndices()
      @selectStatus()

  setIndices: ->
    entries = @querySelectorAll("git-experiment-file-summary-view")
    for entry, idx in entries
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
    entry

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

  moveSelectionUp: =>

  moveSelectionDown: =>

module.exports = document.registerElement "git-experiment-status-list-view",
  prototype: StatusListView.prototype
