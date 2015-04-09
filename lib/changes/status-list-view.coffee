{CompositeDisposable, Disposable} = require 'atom'

GitChanges        = require './git-changes'
CommitMessageView = require './commit-message-view'
UndoCommitView    = require './undo-commit-view'
StatusList        = require './status-list'
observe = require '../observe'

FileSummary   = require './file-summary'
FileSummaryElement   = require './file-summary-element'
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

FileSummaryTag = "git-file-summary-element"

class StatusListElement extends HTMLElement
  initialize: ({@changesView}) ->
    # XXX remove @git after this is refactored
    @git = @changesView.model.git
    @model = new StatusList(git: @changesView.model.git)
    observe @model, ['staged', 'unstaged'], @update.bind(@)
    # XXX chained initialize, bad smell?
    @model.initialize()

  createdCallback: ->
    @subscriptions = new CompositeDisposable

    # Elements
    @innerHTML        = BaseTemplate
    @tabIndex         = -1
    @stagedNode       = @querySelector(".files.staged")
    @unstagedNode     = @querySelector(".files.unstaged")
    @commitMessageBox = @querySelector(".commit-message-box")
    @undoCommitBox    = @querySelector(".undo-last-commit-box")

    # Subviews
    @commitMessageView = new CommitMessageView
    @commitMessageBox.appendChild(@commitMessageView)

    @undoCommitView = new UndoCommitView
    @undoCommitBox.appendChild(@undoCommitView)

  attachedCallback: ->
    @handleEvents()

  handleEvents: =>
    focus = @focus.bind(@)
    focusCommitMessage = @focusCommitMessage.bind(@)
    stageAll = @stageAll.bind(@)
    unstageAll = @unstageAll.bind(@)
    # XXX: I think these events should be past-tense reaction to some state change, not
    # a dispatched command
    @changesView.addEventListener('focus-list', focus)
    @changesView.addEventListener('focus-commit-message', focusCommitMessage)

    @querySelector('.btn-stage-all').addEventListener(stageAll)
    @querySelector('.btn-unstage-all').addEventListener(unstageAll)

    @subscriptions.add new Disposable =>
      @changesView.removeEventListener(focus)
      @changesView.removeEventListener(focusCommitMessage)
      @querySelector('.btn-stage-all').removeEventListener(stageAll)
      @querySelector('.btn-stage-all').removeEventListener(unstageAll)

    # TODO
    # @el.on "click", FileSummaryTag, @entryClicked.bind(@)
    #
    commands = atom.commands.add "git-status-list-view:focus",
      'core:move-down':  @moveSelectionDown
      'core:move-up':    @moveSelectionUp
      'core:move-right': @focusDiffView
      'core:confirm':    @stageSelection
      'core:backspace':  @promptToDiscardChanges
      'git:focus-commit-message': @focusCommitMessage
      'git:open-file': @openInPane

    @subscriptions.add(commands)

  detachedCallback: ->
    @subscriptions.dispose()

  update: =>
    @stagedNode.innerHTML = ''
    @unstagedNode.innerHTML = ''
    # XXX: should append these all at once
    @model.unstaged.forEach @appendUnstaged.bind(@)
    @model.staged.forEach @appendStaged.bind(@)
    @commitMessageView.setStagedCount(@model.staged.length)
    @commitMessageView.update()
    @undoCommitView.update()
    @setIndices()
    @selectDefaultStatus()
    @focus()


  appendUnstaged: (status) ->
    unstagedSummaryView = new FileSummaryElement
    # XXX: confusing use of status to mean two things here
    unstagedSummary = new FileSummary
      file: status
      status: 'unstaged'
      git: @changesView.model.git

    unstagedSummaryView.initialize(unstagedSummary)
    @unstagedNode.appendChild(unstagedSummaryView)

  appendStaged: (status) ->
    stagedSummaryView = new FileSummaryElement
    # XXX: confusing use of status to mean two things here
    stagedSummary = new FileSummary
      file: status
      status: 'staged'
      git: @changesView.model.git

    stagedSummaryView.initialize(stagedSummary)
    @stagedNode.appendChild(stagedSummaryView)

  setIndices: ->
    for entry, idx in @getAllEntries()
      entry.index = idx

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
    # TODO without jQuery
    # container    = $(entry).closest('.files')[0]
    # scrollBottom = container.offsetHeight + container.scrollTop
    # entryTop     = entry.offsetTop
    # entryBottom  = entryTop + entry.offsetHeight
    #
    # if entryBottom > scrollBottom
    #   entry.scrollIntoView(false)
    # else if entry.offsetTop < container.scrollTop
    #   entry.scrollIntoView(true)

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
          @git.forceCheckoutPath(path)
        "Cancel": null

module.exports = document.registerElement "git-status-list-view",
  prototype: StatusListElement.prototype
