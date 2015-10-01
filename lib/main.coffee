{CompositeDisposable} = require 'atom'

GitIndex = require './changes/git-changes'
Changes = require './changes/changes'

HistoryView = null
ChangesElement = null

HISTORY_URI = 'atom://git/view-history'
CHANGES_URI = 'atom://git/view-changes'

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
    atom.commands.add 'atom-workspace', 'git:view-and-commit-changes', ->
      GitExperiment.openChangesElement()

    # Events subscribed to in atom's system can be easily
    # cleaned up with a CompositeDisposable
    @subscriptions = new CompositeDisposable

    # XXX not firing
    @gitIndex().onDidUpdateRepository @didUpdateRepository

    process.nextTick =>
      @subscriptions.add atom.workspace.addOpener (filePath) =>
        switch filePath
          when HISTORY_URI
            historyView or= if @state.history?
              atom.deserializers.deserialize(@state.history)
            else
              createHistoryView(uri: HISTORY_URI)
          when CHANGES_URI
            changesView or= if @state.changes?
              atom.deserializers.deserialize(@state.changes)
            else
              createChangesElement(uri: CHANGES_URI)

  serialize: ->
    {}

  didUpdateRepository: ->
    repo.refreshStatus() for repo in atom.project.getRepositories()

  deactivate: ->
    @subscriptions?.dispose()

  openHistoryView: ->
    atom.workspace.open(HISTORY_URI)

  openChangesElement: ->
    atom.workspace.open(CHANGES_URI)

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

createChangesElement = (state) ->
  ChangesElement ?= require './changes/changes-element'
  changesView = new ChangesElement
  state.model ?= new Changes(gitIndex: GitExperiment.gitIndex())
  changesView.initialize(state)
  changesView

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
