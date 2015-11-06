{CompositeDisposable} = require 'atom'

GitIndex = require './changes/git-changes'
Changes = require './changes/changes'

HistoryView = null
DiffPaneItem = null
ChangesElement = null

HISTORY_URI = 'atom://git/view-history'
CHANGES_URI = 'atom://git/view-changes'
DIFF_URI = 'atom://git/diff/'

changesView = null
historyView = null
branchesView = null

module.exports = GitExperiment =
  subscriptions: null
  state: null
  _gitIndex: null
  gitIndex: ->
    @_gitIndex ?= new GitIndex

  activate: (@state) ->
    atom.commands.add 'atom-workspace', 'git:view-and-commit-changes', =>
      GitExperiment.openChangesPanel()

    atom.commands.add 'atom-workspace', 'git:close-commit-panel', =>
      GitExperiment.closeChangesPanel()
      workspaceElement = atom.views.getView(atom.workspace)
      workspaceElement.focus()

    atom.commands.add 'atom-workspace', 'git:open-file-diff', =>
      editor = atom.workspace.getActiveTextEditor()
      filePath = atom.project.relativizePath(editor.getPath())[1]
      atom.workspace.open(DIFF_URI + filePath)

    atom.commands.add 'atom-workspace', 'git:log-focused', =>
      console.log document.activeElement

    # Events subscribed to in atom's system can be easily
    # cleaned up with a CompositeDisposable
    @subscriptions = new CompositeDisposable

    # XXX not firing
    @gitIndex().onDidUpdateRepository @didUpdateRepository

    process.nextTick =>
      @subscriptions.add atom.workspace.addOpener (filePath) =>
        if filePath is HISTORY_URI
          historyView or= if @state.history?
            atom.deserializers.deserialize(@state.history)
          else
            createHistoryView(uri: HISTORY_URI)
        else if filePath.startsWith(DIFF_URI)
          console.log 'opening diff...', filePath
          createPatchView(uri: filePath, filePath: filePath.replace(DIFF_URI, ''), gitIndex: @gitIndex())

  serialize: ->
    {}

  didUpdateRepository: ->
    repo.refreshStatus() for repo in atom.project.getRepositories()

  deactivate: ->
    @subscriptions?.dispose()

  openHistoryView: ->
    atom.workspace.open(HISTORY_URI)

  closeChangesPanel: ->
    @changesPanel?.hide()

  openChangesPanel: ->
    if @changesPanel?
      @gitIndex().updateRepository()
      @changesPanel.show()
    else
      StatusList = require './changes/status-list'
      @changesPanel = atom.workspace.addRightPanel(item: new StatusList(gitIndex: @gitIndex()))
    statusList = @changesPanel.getItem()
    atom.views.getView(statusList).focus()

atom.commands.add 'atom-workspace', 'git:view-history', ->
  GitExperiment.openHistoryView()

atom.commands.add 'atom-workspace', 'git:checkout-branch', ->
  createBranchesView().toggle()

atom.commands.add 'atom-workspace', 'git:create-branch', ->
  createNewBranchView().toggle()

createHistoryView = (state) ->
  HistoryView ?= require './history/history-view'
  historyView = new HistoryView
  historyView.initialize(state)
  historyView

createPatchView = (state) ->
  DiffPaneItem ?= require './changes/diff-pane-item'
  diffPaneItem = new DiffPaneItem
  diffPaneItem.initialize(state)
  diffPaneItem



createBranchesView = ->
  unless branchesView?
    BranchView  = require './branches/branches-view'
    branchesView = new BranchView
  branchesView

createNewBranchView = ->
  unless newBranchView?
    CreateBranchView  = require './branches/create-branch-view'
    newBranchView = new CreateBranchView
  newBranchView

atom.deserializers.add
  name: 'GitHistoryView'
  deserialize: (state) -> createHistoryView(state)

atom.deserializers.add
  name: 'GitChangesElement'
  deserialize: (state) ->
    console.log "In the GitChangesElement deserializer"
    createChangesElement(state)
