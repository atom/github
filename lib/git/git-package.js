/* @flow */

import {CompositeDisposable, Disposable} from 'atom'
import GitStore from './git-store'
import FileListViewModel from './file-list/file-list-view-model'
import DiffViewModel from './diff/diff-view-model'
import DiffPaneItemComponent from './diff/diff-pane-item-component'
import FileListComponent from './file-list/file-list-component'
import GitStatusBarComponent from './status-bar/git-status-bar-component'
import GitStatusBarViewModel from './status-bar/git-status-bar-view-model'
import GitService from './git-service'
import {DiffURI} from '../common'
import BranchViewModel from './branch/branch-view-model'
import CreateBranchComponent from './branch/create-branch-component'

import type {Panel, Pane} from 'atom' // eslint-disable-line no-duplicate-imports
import type {StatusBar, Tile} from 'status-bar'
import type {ChangeType} from './git-store' // eslint-disable-line no-duplicate-imports

type GitState = {panelVisible: boolean}

type GitPushFunction = () => Promise<void>

export default class GitPackage {
  subscriptions: CompositeDisposable;
  state: GitState;
  changesPanel: ?Panel<FileListViewModel>;
  statusBarTile: ?Tile<GitStatusBarViewModel>;
  fileListViewModel: ?FileListViewModel;
  gitStore: GitStore;
  token: ?string;

  static registerDeserializers (gitPackageInstance) {
    atom.deserializers.add({
      name: 'GitDiffPaneItem',
      deserialize: state => gitPackageInstance.createDiffPaneItem(state)
    })
  }

  static registerViewProviders (gitPackageInstance) {
    atom.views.addViewProvider(DiffViewModel, diffViewModel => {
      const component = new DiffPaneItemComponent({diffViewModel})
      return component.element
    })

    atom.views.addViewProvider(FileListViewModel, fileListViewModel => {
      const component = new FileListComponent({fileListViewModel})
      return component.element
    })

    atom.views.addViewProvider(GitStatusBarViewModel, viewModel => {
      const component = new GitStatusBarComponent(viewModel, () => gitPackageInstance.toggleChangesPanel())
      return component.element
    })
  }

  constructor () {
    this.subscriptions = new CompositeDisposable()
  }

  activate (state: GitState = {panelVisible: false}) {
    this.state = state

    GitPackage.registerDeserializers(this)
    GitPackage.registerViewProviders(this)

    if (!this.hasRepository()) return

    atom.commands.add('atom-workspace', 'git:view-and-commit-changes', () => {
      this.toggleChangesPanel()
    })

    atom.commands.add('atom-workspace', 'git:close-all', () => this.closeAll())

    atom.commands.add('atom-workspace', 'git:open-file-diff', () => {
      this.openDiffForActiveEditor()
    })

    atom.commands.add('atom-workspace', 'git:refresh-status', () => this.update(this.getGitStore(), 'reload'))

    atom.commands.add('atom-workspace', 'git:create-branch', () => this.createBranch())

    this.update(this.getGitStore(), 'reload')

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

  createBranch () {
    const viewModel = new BranchViewModel(this.getGitStore())
    let panel = null
    const onClose = () => {
      if (panel) panel.destroy()
    }
    const component = new CreateBranchComponent({viewModel, onClose})
    panel = atom.workspace.addModalPanel({item: component.element})
    component.focus()
  }

  async update (gitStore: GitStore, changeType: ChangeType): Promise<void> {
    await gitStore.loadFromGit()

    if (changeType === 'commit') {
      this.onDidCommit(gitStore)
    }
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
        this.update(this.gitStore, changeType)
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

  onDidCommit (gitStore: GitStore) {
    const files = gitStore.getFiles()
    // $FlowFixMe: This should be fine?
    const filesByPathName = files.reduce((filesByPathName, file) => {
      const pathName: string = file.getOldPathName() || file.getNewPathName()
      filesByPathName[pathName] = file
      return filesByPathName
    }, {})

    const items = this.getDiffPaneItems()
    for (let {pane, item} of items) {
      if (!filesByPathName[item.pathName]) {
        pane.destroyItem(item)
      }
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

    const viewModel = new GitStatusBarViewModel(this.getGitStore())
    const tile = statusBar.addRightTile({item: viewModel, priority: -100})
    this.subscriptions.add(new Disposable(() => tile.destroy()))
    this.statusBarTile = tile
  }

  consumeGitHub (github: {getToken: () => ?string}) {
    const token = github.getToken()

    if (!this.hasRepository()) return

    // TODO: consider refactoring to pass this.github.getToken to fileListViewModel
    this.getFileListViewModel().setToken(token)
  }

  provideGitPush (): ?GitPushFunction {
    if (!this.hasRepository()) return null

    return () => this.getFileListViewModel().push()
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
