{CompositeDisposable} = require 'atom'
HistoryView = null

URI = 'atom://git-experiment/view-history'

module.exports = GitExperiment =
  subscriptions: null

  activate: (state) ->
    # Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    @subscriptions = new CompositeDisposable
    @subscriptions.add atom.workspace.registerOpener (filePath) =>
      if filePath is URI
        HistoryView ?= require './history-view'
        new HistoryView()

    @openHistoryView()

  deactivate: ->
    @subscriptions.dispose()

  serialize: ->
    # gitExperimentViewState: @gitExperimentView.serialize()

  openHistoryView: ->
    atom.workspace.open(URI)

atom.commands.add 'atom-workspace', 'git-experiment:view-history', =>
  GitExperiment.openHistoryView()

window.git = require 'nodegit'
