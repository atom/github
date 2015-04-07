$                 = require 'jquery'
GitChanges        = require './git-changes'
CommitMessageView = require './commit-message-view'
UndoCommitView    = require './undo-commit-view'

FileSummary   = require './file-summary'
FileSummaryView   = require './file-summary-view'
shell             = require 'shell'
fs                = require 'fs'

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

FileSummaryTag = "git-file-summary-view"

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
    @base = @el.closest('.git-root-view')
    @handleEvents()

  handleEvents: =>
    @base.on "focus-list", @focus.bind(@)
    @base.on "focus-commit-message", @focusCommitMessage.bind(@)

    @el.on "click", ".btn-stage-all", @stageAll.bind(@)
    @el.on "click", ".btn-unstage-all", @unstageAll.bind(@)
    @el.on "click", FileSummaryTag, @entryClicked.bind(@)

    @updateSubscription = atom.on 'did-update-git-repository', @update.bind(@)

    @commands = atom.commands.add "git-status-list-view:focus",
      'core:move-down':  @moveSelectionDown
      'core:move-up':    @moveSelectionUp
      'core:move-right': @focusDiffView
      'core:confirm':    @stageSelection
      'core:backspace':  @promptToDiscardChanges
      'git:focus-commit-message': @focusCommitMessage
      'git:open-file': @openInPane

  detachedCallback: ->
    @base.off "focus-list"
    @base.off "index-updated"
    @base.off "focus-commit-message"

    @el.off "click", ".btn-stage-all"
    @el.off "click", ".btn-unstage-all"
    @el.off "click", FileSummaryTag

    if @commands
      @commands.dispose()
      @commands = null

    if @updateSubscription
      @updateSubscription.dispose()
      @updateSubscription = null

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
          unstagedSummaryView = new FileSummaryView
          unstagedSummary = new FileSummary({file: status, status: 'unstaged'})
          unstagedSummaryView.initialize(unstagedSummary)
          @unstagedNode.appendChild(unstagedSummaryView)
        if @isStaged(status)
          stagedSummaryView = new FileSummaryView
          stagedSummary = new FileSummary({file: status, status: 'staged'})
          stagedSummaryView.initialize(stagedSummary)
          @stagedNode.appendChild(stagedSummaryView)

      @commitMessageView.setStagedCount(@getStagedEntries().length)
      @commitMessageView.update()
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
    entryBottom  = entryTop + entry.offsetHeight

    if entryBottom > scrollBottom
      entry.scrollIntoView(false)
    else if entry.offsetTop < container.scrollTop
      entry.scrollIntoView(true)

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
    @git.stageAllPaths(paths).then => atom.emit('did-update-git-repository')

  unstageAll: ->
    paths = []
    paths.push entry.path for entry in @getStagedEntries()
    @git.unstageAllPaths(paths).then => atom.emit('did-update-git-repository')

  openInPane: (e) ->
    selected = @selectedEntry()
    atom.workspace.open(selected.path) if selected?.path

  promptToDiscardChanges: ->
    selected = @selectedEntry()
    return unless selected? and selected.path
    path = selected.path
    localPath = "#{@git.repoPath}/#{path}"
    exists = try
      !!fs.statSync(localPath)
    catch
      false

    message = "Are you sure you want to discard these changes?"
    details = "You are resetting #{path} to the last committed \
               version on this branch. "
    details += "The modified file will be placed in the trash." if exists

    atom.confirm
      message: message
      detailedMessage: details
      buttons:
        "Discard Changes": =>
          shell.moveItemToTrash(localPath) if exists
          @git.forceCheckoutPath(path).then =>
            atom.emit('did-update-git-repository')

        "Cancel": null

module.exports = document.registerElement "git-status-list-view",
  prototype: StatusListView.prototype
