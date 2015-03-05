{CompositeDisposable} = require 'atom'
HistoryView = null
ChangesView = null

HISTORY_URI = 'atom://git/view-history'
CHANGES_URI = 'atom://git/view-changes'

changesView = null
historyView = null
serializedState = {}

module.exports = GitExperiment =
  subscriptions: null
  state: null

  activate: (@state) ->
    # Events subscribed to in atom's system can be easily
    # cleaned up with a CompositeDisposable
    @subscriptions = new CompositeDisposable
    process.nextTick =>
      @subscriptions.add atom.workspace.onWillDestroyPaneItem (pane) =>
        switch pane.item
          when historyView
            serializedState.history = historyView.serialize()
          when changesView
            serializedState.changes = changesView.serialize()

      @subscriptions.add atom.workspace.registerOpener (filePath) =>
        switch filePath
          when HISTORY_URI
            historyView or= if @state.history?
              console.log 'deserialized'
              atom.deserializers.deserialize(@state.history)
            else
              console.log 'created'
              createHistoryView(uri: HISTORY_URI)
          when CHANGES_URI
            changesView or= if @state.changes?
              atom.deserializers.deserialize(@state.changes)
            else
              createChangesView(uri: CHANGES_URI)

  serialize: ->
    serializedState

  deactivate: ->
    @subscriptions?.dispose()

  openHistoryView: ->
    atom.workspace.open(HISTORY_URI)

  openChangesView: ->
    atom.workspace.open(CHANGES_URI)

atom.commands.add 'atom-workspace', 'git:view-history', =>
  GitExperiment.openHistoryView()

atom.commands.add 'atom-workspace', 'git:view-and-commit-changes', =>
  GitExperiment.openChangesView()

createHistoryView = (state) ->
 HistoryView ?= require './history/history-view'
 historyView = new HistoryView
 historyView.initialize(state)
 historyView

createChangesView = (state) ->
  ChangesView ?= require './changes/changes-view'
  changesView = new ChangesView
  changesView.initialize(state)
  changesView

atom.deserializers.add
  name: 'GitHistoryView'
  deserialize: (state) -> createHistoryView(state)

atom.deserializers.add
  name: 'GitChangesView'
  deserialize: (state) -> createChangesView(state)
