{CompositeDisposable} = require 'atom'
HistoryView = null
ChangesView = null

HISTORY_URI = 'atom://git/view-history'
CHANGES_URI = 'atom://git/view-changes'

module.exports = GitExperiment =
  subscriptions: null
  historyView: null
  changesView: null
  state: null

  activate: (@state) ->
    # Events subscribed to in atom's system can be easily
    # cleaned up with a CompositeDisposable
    @subscriptions = new CompositeDisposable
    process.nextTick =>
      @subscriptions.add atom.workspace.onWillDestroyPaneItem (pane) =>
        switch pane.item
          when @historyView
            @state.history = @historyView.serialize()
          when @changesView
            @state.changes = @changesView.serialize()

      @subscriptions.add atom.workspace.registerOpener (filePath) =>
        switch filePath
          when HISTORY_URI
            @historyView or= if @state.history?
              atom.deserializers.deserialize(@state.history)
            else
              createHistoryView(uri: HISTORY_URI)
          when CHANGES_URI
            @changesView or= if @state.changes?
              atom.deserializers.deserialize(@state.changes)
            else
              createChangesView(uri: CHANGES_URI)

  deactivate: ->
    @subscriptions?.dispose()

  serialize: ->
    @state

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
 view = new HistoryView
 view.initialize(state)
 view

createChangesView = (state) ->
  ChangesView ?= require './changes/changes-view'
  view = new ChangesView
  view.initialize(state)
  view

atom.deserializers.add
  name: 'GitHistoryView'
  deserialize: (state) -> createHistoryView(state)

atom.deserializers.add
  name: 'GitChangesView'
  deserialize: (state) -> createChangesView(state)
