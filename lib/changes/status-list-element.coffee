# StatusListElement
# =================
#
# This element contains everything in the left pane. This element and its model
# represent the list of staged and unstaged changes, and it has CommitMessageElement
# and UndoCommitView as its children.
#
# Its initial refactor is still in progress, in other words there's still a bunch
# of stuff that needs to be moved into the viewmodel and tested.

{CompositeDisposable, Disposable} = require 'atom'

GitChanges        = require './git-changes'
CommitMessageElement = require './commit-message-element'
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

    # Subviews
    @commitMessageView = new CommitMessageElement
    @commitMessageView.initialize({changesView: @changesView})
    @commitMessageBox.appendChild(@commitMessageView)

    @undoCommitView = new UndoCommitView
    @undoCommitBox.appendChild(@undoCommitView)

    observe @model, ['staged', 'unstaged'], @update.bind(@)
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

  attachedCallback: ->
    @handleEvents()

  handleEvents: =>
    focus = @focus.bind(@)
    focusCommitMessage = @focusCommitMessage.bind(@)
    stageAll = @model.stageAll
    unstageAll = @model.unstageAll

    # XXX: I think these events should be past-tense reaction to some state change, not
    # a dispatched command
    @changesView.addEventListener('focus-list', focus)
    @changesView.addEventListener('focus-commit-message', focusCommitMessage)

    @querySelector('.btn-stage-all').addEventListener('click', stageAll)
    @querySelector('.btn-unstage-all').addEventListener('click', unstageAll)

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
      'core:move-right': @focusDiffElement
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
    # TODO the commit message view could probably keep track of this itself
    @commitMessageView.model.setStagedCount(@model.staged.length)
    @commitMessageView.update()
    @undoCommitView.update()
    @setIndices()
    @selectDefaultStatus()
    @focus()


  appendUnstaged: (status) ->
    unstagedSummaryElement = new FileSummaryElement
    # XXX: confusing use of status to mean two things here
    unstagedSummary = new FileSummary
      file: status
      status: 'unstaged'
      git: @changesView.model.git
    unstagedSummaryElement.initialize(model: unstagedSummary, changesView: @changesView)
    @unstagedNode.appendChild(unstagedSummaryElement)

  appendStaged: (status) ->
    stagedSummaryElement = new FileSummaryElement
    # XXX: confusing use of status to mean two things here
    stagedSummary = new FileSummary
      file: status
      status: 'staged'
      git: @changesView.model.git

    stagedSummaryElement.initialize(model: stagedSummary, changesView: @changesView)
    @stagedNode.appendChild(stagedSummaryElement)

  setIndices: ->
    for entry, idx in @getAllEntries()
      entry.index = idx

  empty: ->
    @changesView.noChangeSelected()

  focusDiffElement: ->
    @changesView.focusDiffElement()

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
    @changesView.model.setRenderedPatch(entry)

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

  openInPane: (e) ->
    selected = @selectedEntry()
    atom.workspace.open(selected.path) if selected?.path

  promptToDiscardChanges: ->
    selected = @selectedEntry()
    return unless selected? and selected.model?.path()
    fileSummary = selected.model

    message = "Are you sure you want to discard these changes?"
    details = "You are resetting #{fileSummary.path()} to the last committed \
               version on this branch. "
    details += "The modified file will be placed in the trash." if fileSummary.exists()

    atom.confirm
      message: message
      detailedMessage: details
      buttons:
        "Discard Changes": =>
          fileSummary.discard()
        "Cancel": null

module.exports = document.registerElement "git-status-list-view",
  prototype: StatusListElement.prototype
