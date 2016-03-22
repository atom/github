/* @flow */

import {CompositeDisposable} from 'atom'
import FileList from './file-list'
import FileListViewModel from './file-list-view-model'
import DiffViewModel from './diff-view-model'
import StatusBarViewModel from './status-bar-view-model'
import FileDiffViewModel from './file-diff-view-model'
import GitService from './git-service'
import {DiffURI} from './common'

import type {Panel, Pane} from 'atom'
import type {StatusBar, Tile} from 'status-bar'

type GitState = {panelVisible: boolean}

export default class GitPackage {
  subscriptions: CompositeDisposable;
  state: GitState;
  changesPanel: ?Panel<FileListViewModel>;
  statusBarTile: ?Tile<StatusBarViewModel>;
  fileListViewModel: FileListViewModel;
  gitService: GitService;

  constructor () {
    this.subscriptions = new CompositeDisposable()
  }

  activate (state: GitState = {panelVisible: false}) {
    this.state = state

    if (!this.hasRepository()) return

    atom.commands.add('atom-workspace', 'git:view-and-commit-changes', () => {
      this.toggleChangesPanel()
    })

    atom.commands.add('atom-workspace', 'git:close-all', () => this.closeAll())

    atom.commands.add('atom-workspace', 'git:open-file-diff', () => {
      this.openDiffForActiveEditor()
    })

    atom.commands.add('atom-workspace', 'git:refresh-status', () => this.update())

    this.update()

    if (state.panelVisible) {
      this.openChangesPanel()
    }

    process.nextTick(() => {
      this.subscriptions.add(atom.workspace.addOpener((uri, options) => {
        if (uri.startsWith(DiffURI)) {
          return this.createDiffPaneItem({
            uri,
            pending: options.pending
          })
        }
      }))
    })
  }

  hasRepository (): boolean {
    return atom.project.getRepositories().length > 0 && atom.project.getRepositories()[0]
  }

  async update (): Promise<void> {
    const promises = []

    promises.push(this.getFileListViewModel().update())

    const statusBarTile = this.statusBarTile
    if (statusBarTile) {
      promises.push(statusBarTile.getItem().update())
    }

    await Promise.all(promises)
  }

  serialize (): GitState {
    const changesPanel = this.changesPanel
    const visible = (changesPanel && changesPanel.isVisible()) || false
    return {
      panelVisible: visible
    }
  }

  deactivate () {
    this.subscriptions.dispose()
  }

  getFileListViewModel (): FileListViewModel {
    if (!this.fileListViewModel) {
      const fileList = new FileList([], this.getGitService())
      this.fileListViewModel = new FileListViewModel(fileList, this.getGitService())
      this.subscriptions.add(this.fileListViewModel.onDidCommit(() => this.onDidCommit()))
    }

    return this.fileListViewModel
  }

  getDiffPaneItems (): Array<{pane: Pane, item: DiffViewModel}> {
    const panes = atom.workspace.getPanes()
    const itemsToClose = []
    for (let pane of panes) {
      const items = pane.getItems()
      for (let item of items) {
        if (item instanceof DiffViewModel) {
          itemsToClose.push({pane, item})
        }
      }
    }

    return itemsToClose
  }

  closeAll () {
    this.closeChangesPanel()
    const items = this.getDiffPaneItems()
    for (let {pane, item} of items) {
      pane.destroyItem(item)
    }

    const workspaceElement = atom.views.getView(atom.workspace)
    workspaceElement.focus()
  }

  async onDidCommit (): Promise<void> {
    const statuses = await this.gitService.getStatuses()

    const items = this.getDiffPaneItems()
    for (let {pane, item} of items) {
      if (!statuses[item.pathName]) {
        pane.destroyItem(item)
      }
    }

    this.update()
  }

  getGitService (): GitService {
    if (!this.gitService) {
      const repo = atom.project.getRepositories()[0].async
      this.gitService = new GitService(repo)
      this.subscriptions.add(this.gitService.onDidChange(() => this.update()))
    }

    return this.gitService
  }

  toggleChangesPanel () {
    if (this.changesPanel && this.changesPanel.isVisible()) {
      this.closeChangesPanel()
    } else {
      this.openChangesPanel()
    }
  }

  closeChangesPanel () {
    if (this.changesPanel) {
      this.changesPanel.hide()
    }
  }

  async openChangesPanel (): Promise<void> {
    const changesPanel = this.changesPanel
    if (changesPanel) {
      changesPanel.show()
    } else {
      this.changesPanel = atom.workspace.addRightPanel({item: this.getFileListViewModel()})
    }

    const viewModel = this.getFileListViewModel()

    await viewModel.openSelectedFileDiff()
    atom.views.getView(viewModel).focus()
  }

  openDiffForActiveEditor () {
    const editor = atom.workspace.getActiveTextEditor()
    const editorPath = editor.getPath()
    if (!editorPath) return

    const filePath = atom.project.relativizePath(editorPath)[1]
    const diff = this.getFileListViewModel().getDiffForPathName(filePath)
    return diff.openDiff({pending: true})
  }

  consumeStatusBar (statusBar: StatusBar) {
    if (!this.hasRepository()) return

    const viewModel = new StatusBarViewModel(this.getGitService())
    this.statusBarTile = statusBar.addRightTile({item: viewModel, priority: -100})
  }

  createDiffPaneItem ({uri, pending}: {uri: string, pending: boolean}): DiffViewModel {
    const pathName = uri.replace(DiffURI, '')
    const fileDiff = this.getFileListViewModel().getDiffForPathName(pathName)
    const fileDiffViewModel = new FileDiffViewModel(fileDiff)
    const gitService = this.getGitService()
    const fileList = new FileList([fileDiff], gitService)
    const viewModel = new DiffViewModel({
      gitService,
      uri,
      pathName,
      fileDiffViewModel,
      pending: !!pending,
      deserializer: 'GitDiffPaneItem',
      fileList: fileList
    })
    viewModel.onDidStage(() => this.update())

    return viewModel
  }
}
