/** @babel */

import {CompositeDisposable} from 'atom'
import FileList from './file-list'
import FileListViewModel from './file-list-view-model'
import DiffViewModel from './diff-view-model'
import {DiffURI} from './common'

let FileListComponent = null
let DiffPaneItemComponent = null
let fileList = null

const Git = {
  subscriptions: null,
  state: null,
  changesPanel: null,

  activate: (state) => {
    this.state = state

    atom.commands.add('atom-workspace', 'git:view-and-commit-changes', () => {
      Git.openChangesPanel()
    })

    atom.commands.add('atom-workspace', 'git:close-commit-panel', () => {
      Git.closeChangesPanel()
      let workspaceElement = atom.views.getView(atom.workspace)
      workspaceElement.focus()
    })

    atom.commands.add('atom-workspace', 'git:open-file-diff', () => {
      Git.openDiffForActiveEditor()
    })

    atom.commands.add('atom-workspace', 'git:refresh-status', () => {
      Git.update()
    })

    this.subscriptions = new CompositeDisposable()
    Git.getFileListInstance().loadFromGitUtils()

    if (state && state.panelVisible) {
      Git.openChangesPanel()
    }

    process.nextTick(() => {
      this.subscriptions.add(atom.workspace.addOpener((uri, options) => {
        if (uri.startsWith(DiffURI)) {
          return createDiffPaneItem({
            uri,
            pending: options.pending
          })
        }
      }))
    })
  },

  update: () => {
    Git.getFileListInstance().loadFromGitUtils()

    const viewModel = Git.getFileListViewModel()
    if (viewModel) {
      viewModel.update()
    }
  },

  serialize: () => {
    return {
      panelVisible: this.changesPanel && this.changesPanel.isVisible()
    }
  },

  deactivate: () => {
    if (this.subscriptions) {
      this.subscriptions.dispose()
    }
  },

  getFileListInstance: () => {
    if (!fileList) {
      fileList = new FileList([], {stageOnChange: true})
      fileList.onDidUserChange(() => {
        Git.getFileListInstance().loadFromGitUtils()
      })
    }
    return fileList
  },

  closeChangesPanel: () => {
    if (this.changesPanel) {
      this.changesPanel.hide()
    }
  },

  openChangesPanel: () => {
    let fileListViewModel
    if (this.changesPanel) {
      this.changesPanel.show()
    } else {
      fileListViewModel = new FileListViewModel(Git.getFileListInstance())
      fileListViewModel.onDidUserChange(() => Git.update())
      this.changesPanel = atom.workspace.addRightPanel({item: fileListViewModel})
    }
    fileListViewModel = this.changesPanel.getItem()
    return atom.views.getView(fileListViewModel).focus()
  },

  getFileListViewModel: () => {
    return this.changesPanel.getItem()
  },

  openDiffForActiveEditor: () => {
    const editor = atom.workspace.getActiveTextEditor()
    const editorPath = editor.getPath()
    if (!editorPath) return

    const filePath = atom.project.relativizePath(editorPath)[1]
    return Git.getFileListInstance().getOrCreateFileFromPathName(filePath).openDiff({pending: true})
  }
}

let createDiffPaneItem = ({uri, pending}) => {
  let pathName = uri.replace(DiffURI, '')
  let fileDiff = Git.getFileListInstance().getOrCreateFileFromPathName(pathName)
  return new DiffViewModel({
    uri,
    pathName,
    pending: !!pending,
    deserializer: 'GitDiffPaneItem',
    fileList: new FileList([fileDiff])
  })
}

atom.deserializers.add({
  name: 'GitDiffPaneItem',
  deserialize: (state) => {
    return createDiffPaneItem(state)
  }
})

atom.views.addViewProvider(DiffViewModel, (diffViewModel) => {
  if (!DiffPaneItemComponent) {
    DiffPaneItemComponent = require('./diff-pane-item-component')
  }
  let component = new DiffPaneItemComponent({diffViewModel})
  return component.element
})

atom.views.addViewProvider(FileListViewModel, (fileListViewModel) => {
  if (!FileListComponent) {
    FileListComponent = require('./file-list-component')
  }
  let component = new FileListComponent({fileListViewModel})
  return component.element
})

module.exports = Git
