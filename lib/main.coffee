{CompositeDisposable} = require 'atom'
HistoryView = null
ChangesView = null

HISTORY_URI = 'atom://git-experiment/view-history'
CHANGES_URI = 'atom://git-experiment/view-changes'

module.exports = GitExperiment =
  subscriptions: null

  activate: (state) ->
    # Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    @subscriptions = new CompositeDisposable
    @subscriptions.add atom.workspace.registerOpener (filePath) =>
      switch filePath
        when HISTORY_URI
          HistoryView ?= require './history-view'
          new HistoryView()
        when CHANGES_URI
          ChangesView ?= require './changes-view'
          new ChangesView()

    #@openChangesView()

  deactivate: ->
    @subscriptions.dispose()

  serialize: ->
    # gitExperimentViewState: @gitExperimentView.serialize()

  openHistoryView: ->
    atom.workspace.open(HISTORY_URI)

  openChangesView: ->
    atom.workspace.open(CHANGES_URI)

atom.commands.add 'atom-workspace', 'git-experiment:view-history', =>
  GitExperiment.openHistoryView()

atom.commands.add 'atom-workspace', 'git-experiment:view-and-commit-changes', =>
  GitExperiment.openChangesView()

window.git = require 'nodegit'
