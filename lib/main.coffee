{CompositeDisposable} = require 'atom'
DiffsView = null

URI = 'atom://git-experiment/view-diffs'

module.exports = GitExperiment =
  subscriptions: null

  activate: (state) ->
    # Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    @subscriptions = new CompositeDisposable
    @subscriptions.add atom.workspace.registerOpener (filePath) =>
      if filePath is URI
        DiffsView ?= require './diffs-view'
        new DiffsView()

  deactivate: ->
    @subscriptions.dispose()
    @gitExperimentView.destroy()

  serialize: ->
    # gitExperimentViewState: @gitExperimentView.serialize()

  openDiffsView: ->
    atom.workspace.open(URI)

atom.commands.add 'atom-workspace', 'git-experiment:view-diffs', =>
  GitExperiment.openDiffsView()
