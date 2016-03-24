/* @flow */

import {CompositeDisposable, Disposable} from 'atom'
import GitStore from './git-store'
import FileListViewModel from './file-list-view-model'
import DiffViewModel from './diff-view-model'
import StatusBarViewModel from './status-bar-view-model'
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
  gitStore: GitStore;

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

  update (): Promise<void> {
    return this.getGitStore().loadFromGit()
  }

  serialize (): GitState {
    const changesPanel = this.changesPanel
    const visible = (changesPanel && changesPanel.isVisible()) || false
    return {
      panelVisible: visible
    }
  }

  deactivate () {
    this.closeAll()
    this.subscriptions.dispose()
    this.subscriptions = new CompositeDisposable()
  }

  getFileListViewModel (): FileListViewModel {
    if (!this.fileListViewModel) {
      this.fileListViewModel = new FileListViewModel(this.getGitStore())
    }

    return this.fileListViewModel
  }

  getGitStore (): GitStore {
    if (!this.gitStore) {
      const repo = atom.project.getRepositories()[0].async
      const gitService = new GitService(repo)

      this.gitStore = new GitStore(gitService)
      this.subscriptions.add(this.gitStore.onDidChange(({changeType}) => {
        this.update(changeType)
      }))
    }

    return this.gitStore
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

    const viewModel = new StatusBarViewModel(this.getGitStore())
    const tile = statusBar.addRightTile({item: viewModel, priority: -100})
    this.subscriptions.add(new Disposable(() => tile.destroy()))
    this.statusBarTile = tile
  }

  createDiffPaneItem ({uri, pending}: {uri: string, pending: boolean}): DiffViewModel {
    const pathName = uri.replace(DiffURI, '')
    const gitStore = this.getGitStore()
    const fileListViewModel = this.getFileListViewModel()
    return new DiffViewModel({
      gitStore,
      fileListViewModel,
      uri,
      pathName,
      pending,
      deserializer: 'GitDiffPaneItem'
    })
  }
}
