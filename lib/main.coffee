{CompositeDisposable} = require 'atom'

FileList = require './file-list'
FileListComponent = null
DiffPaneItem = null

DIFF_URI = 'atom://git/diff/'

module.exports = GitExperiment =
  subscriptions: null
  state: null
  changesPanel: null

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

    @subscriptions = new CompositeDisposable

    process.nextTick =>
      @subscriptions.add atom.workspace.addOpener (filePath) =>
        if filePath.startsWith(DIFF_URI)
          createDiffPaneItem(uri: filePath, filePath: filePath.replace(DIFF_URI, ''), gitIndex: @gitIndex())

  serialize: ->
    {}

  deactivate: ->
    @subscriptions?.dispose()

  closeChangesPanel: ->
    @changesPanel?.hide()

  openChangesPanel: ->
    if @changesPanel?
      @gitIndex().updateRepository()
      @changesPanel.show()
    else
      fileList = new FileList()
      fileList.loadFromGitUtils()
      @changesPanel = atom.workspace.addRightPanel(item: fileList)
    fileList = @changesPanel.getItem()
    atom.views.getView(fileList).focus()

createDiffPaneItem = (state) ->
  DiffPaneItem ?= require './changes/diff-pane-item'
  diffPaneItem = new DiffPaneItem
  diffPaneItem.initialize(state)
  diffPaneItem

atom.views.addViewProvider FileList, (fileList) ->
  FileListComponent ?= require './file-list-component'
  component = new FileListComponent({fileList: fileList})
  component.element

# Maybe add this later?
# atom.deserializers.add
#   name: 'GitHistoryView'
#   deserialize: (state) -> createHistoryView(state)
