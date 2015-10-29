# StatusListElement
# =================
#
# This element contains everything in the left pane. This element and its model
# represent the list of staged and unstaged changes, and it has CommitMessageElement
# and UndoCommitElement as its children.
#
# Its initial refactor is still in progress, in other words there's still a bunch
# of stuff that needs to be moved into the viewmodel and tested.

{CompositeDisposable, Disposable} = require 'atom'

GitIndex        = require './git-changes'
CommitMessageElement = require './commit-message-element'
UndoCommitElement    = require './undo-commit-element'
StatusList        = require './status-list'
observe = require '../observe'

FileSummary   = require './file-summary'
FileSummaryElement   = require './file-summary-element'

DOMListener = require 'dom-listener'

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
  initialize: ({@model}) ->
    gitIndex = @model.gitIndex
    @classList.add('git-root-view')

    # Subviews
    @commitMessageView = new CommitMessageElement
    @commitMessageView.initialize({gitIndex})
    @commitMessageBox.appendChild(@commitMessageView)

    @undoCommitView = new UndoCommitElement
    @undoCommitView.initialize({gitIndex})
    @undoCommitBox.appendChild(@undoCommitView)

    observe @model, ['staged', 'unstaged'], @update.bind(this)
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
    listener = new DOMListener(this)
    @subscriptions.add listener.add('.btn-stage-all', 'click', @model.stageAll)
    @subscriptions.add listener.add('.btn-unstage-all', 'click', @model.unstageAll)

    # TODO: move this to the FileSummaryView itself.
    @subscriptions.add listener.add(FileSummaryTag, 'click', @entryClicked.bind(this))

    # XXX: These events should be past-tense reaction to a model state change, not
    # a dispatched command on a DOM elelemt
    # changesListener = new DOMListener(@changesView)
    #
    # @subscriptions.add changesListener.add(@changesView, 'focus-list', @focus.bind(this))
    # @subscriptions.add changesListener.add(@changesView, 'focus-commit-message', @focusCommitMessage.bind(this))

    commands = atom.commands.add "git-status-list-view:focus",
      'core:move-down':  @moveSelectionDown
      'core:move-up':    @moveSelectionUp
      'core:move-right': @focusDiffElement
      'core:confirm':    @stageSelection
      'core:backspace':  @promptToDiscardChanges
      'git:focus-commit-message': @focusCommitMessage
      'git:open-file': @openInPane
      'git:open-diff': @openDiff

    @subscriptions.add(commands)

  detachedCallback: ->
    @subscriptions.dispose()

  update: =>
    @stagedNode.innerHTML = ''
    @unstagedNode.innerHTML = ''
    # XXX: should append these all at once
    @model.unstaged.forEach @appendUnstaged.bind(this)
    @model.staged.forEach @appendStaged.bind(this)
    # TODO the commit message view could probably keep track of this itself
    @commitMessageView.model.setStagedCount(@model.staged.length)
    @commitMessageView.update()
    @undoCommitView.update()
    @setIndices()
    @selectDefaultStatus()

  appendUnstaged: (fileSummary) ->
    unstagedSummaryElement = new FileSummaryElement
    unstagedSummaryElement.initialize(model: fileSummary)
    @unstagedNode.appendChild(unstagedSummaryElement)

  appendStaged: (fileSummary) ->
    stagedSummaryElement = new FileSummaryElement
    stagedSummaryElement.initialize(model: fileSummary)
    @stagedNode.appendChild(stagedSummaryElement)

  setIndices: ->
    for entry, idx in @getAllEntries()
      entry.index = idx

  empty: ->
    # @changesView.noChangeSelected()

  focusDiffElement: ->
    # @changesView.focusDiffElement()

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
    # Entry is a FileSummaryElement
    return unless entry?

    @selectedPath   = entry.model.path()
    @selectedStatus = entry.model.status
    @selectedIndex  = entry.index # ?

    # XXX this stuff should just react to model attribute changes
    selectedEntries = @getSelectedEntries()

    # At the very least, invert this
    @deselect(selectedEntries)
    entry.classList.add("selected")

    # @changesView.model.setRenderedPatch(entry.model)

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


  # TODO: these things that modify the selection should probably be managed
  # by the StatusList or FileSummary view models. It's a good rule of thumb to
  # be skeptical of views calling into the models of their child views to check
  # whether to then update the DOM.

  moveSelectionUp: =>
    selected = @selectedEntry()
    prev = selected.previousElementSibling
    unless prev
      if selected.model.status == 'staged'
        prev = @querySelector(".unstaged #{FileSummaryTag}:last-of-type")
    prev?.click()

  moveSelectionDown: =>
    selected = @selectedEntry()
    next = selected.nextElementSibling
    unless next
      if selected.model.status == 'unstaged'
        next = @querySelector(".staged #{FileSummaryTag}")
    next?.click()

  openInPane: (e) ->
    @selectedEntry()?.model?.open()

  openDiff: (e) ->
    @selectedEntry()?.model?.openDiff()

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
        "Discard Changes": ->
          fileSummary.discard()
        "Cancel": null

module.exports = document.registerElement "git-status-list-view",
  prototype: StatusListElement.prototype
