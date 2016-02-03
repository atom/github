/** @babel */

import {CompositeDisposable} from 'atom'
import FileList from './file-list'
import FileListViewModel from './file-list-view-model'
import DiffViewModel from './diff-view-model'
import Common from './common'

let FileListComponent = null
let DiffPaneItemComponent = null

module.exports = GitExperiment = {
  subscriptions: null,
  state: null,
  changesPanel: null,

  activate: (state) => {
    this.state = state

    atom.commands.add('atom-workspace', 'git:view-and-commit-changes', () => {
      GitExperiment.openChangesPanel()
    })

    atom.commands.add('atom-workspace', 'git:close-commit-panel', () => {
      GitExperiment.closeChangesPanel()
      let workspaceElement = atom.views.getView(atom.workspace)
      workspaceElement.focus()
    })

    atom.commands.add('atom-workspace', 'git:open-file-diff', () => {
      let editor = atom.workspace.getActiveTextEditor()
      let filePath = atom.project.relativizePath(editor.getPath())[1]
      atom.workspace.open(Common.DiffURI + filePath)
    })

    atom.commands.add('atom-workspace', 'git:refresh-status', () => {
      this.fileList.loadFromGitUtils()
    })

    this.subscriptions = new CompositeDisposable

    this.fileList = new FileList()
    this.fileList.loadFromGitUtils()

    process.nextTick(() => {
      this.subscriptions.add(atom.workspace.addOpener((filePath) => {
        if (!filePath.startsWith(Common.DiffURI)) return
        return createDiffPaneItem({
          uri: filePath,
          pathName: filePath.replace(Common.DiffURI, ''),
          fileList: this.fileList
        })
      }))
    })
  },

  serialize: () => {
    return {}
  },

  deactivate: () => {
    if (this.subscriptions)
      this.subscriptions.dispose()
  },

  closeChangesPanel: () => {
    if (this.changesPanel)
      this.changesPanel.hide()
  },

  openChangesPanel: () => {
    if (this.changesPanel) {
      this.changesPanel.show()
    }
    else {
      let fileListViewModel = new FileListViewModel(this.fileList)
      this.changesPanel = atom.workspace.addRightPanel({item: fileListViewModel})
    }
    let fileList = this.changesPanel.getItem()
    return atom.views.getView(fileList).focus()
  },
}

let createDiffPaneItem = ({uri, pathName, fileList}) => {
  let fileDiff = fileList.getFileDiffFromPathName(pathName)
  return new DiffViewModel({uri: uri, fileList: new FileList([fileDiff])})
}

atom.views.addViewProvider(DiffViewModel, (diffViewModel) => {
  if (!DiffPaneItemComponent)
    DiffPaneItemComponent = require('./diff-pane-item-component')
  let component = new DiffPaneItemComponent({diffViewModel})
  return component.element
})

atom.views.addViewProvider(FileListViewModel, (fileListViewModel) => {
  if (!FileListComponent)
    FileListComponent = require('./file-list-component')
  let component = new FileListComponent({fileListViewModel})
  return component.element
})

// Maybe add this later?
// atom.deserializers.add
//   name: 'GitHistoryView'
//   deserialize: (state) => createHistoryView(state)
