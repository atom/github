{CompositeDisposable} = require 'atom'

FileList = require './file-list'
FileListViewModel = require './file-list-view-model'
DiffViewModel = require './diff-view-model'
FileListComponent = null
DiffComponent = null
DiffPaneItem = null

Common = require './common'

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
      atom.workspace.open(Common.DiffURI + filePath)

    @subscriptions = new CompositeDisposable

    @fileList = new FileList()
    @fileList.loadFromGitUtils()

    process.nextTick =>
      @subscriptions.add atom.workspace.addOpener (filePath) =>
        return unless filePath.startsWith(Common.DiffURI)
        createDiffPaneItem(uri: filePath, pathName: filePath.replace(Common.DiffURI, ''), fileList: @fileList)

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
      fileListViewModel = new FileListViewModel(@fileList)
      @changesPanel = atom.workspace.addRightPanel(item: fileListViewModel)
    fileList = @changesPanel.getItem()
    atom.views.getView(fileList).focus()

createDiffPaneItem = ({uri, pathName, fileList}) ->
  fileDiff = fileList.getFileDiffFromPathName(pathName)
  new DiffViewModel({uri: uri, fileDiffs: [fileDiff]})

atom.views.addViewProvider DiffViewModel, (diffViewModel) ->
  DiffComponent ?= require './diff-component'
  component = new DiffComponent({diffViewModel: diffViewModel})
  component.element

atom.views.addViewProvider FileListViewModel, (fileListViewModel) ->
  FileListComponent ?= require './file-list-component'
  component = new FileListComponent({fileListViewModel: fileListViewModel})
  component.element

# Maybe add this later?
# atom.deserializers.add
#   name: 'GitHistoryView'
#   deserialize: (state) -> createHistoryView(state)
