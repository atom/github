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

import {Directory} from 'pathwatcher'

import type {GitRepositoryAsync, Panel, Pane} from 'atom' // eslint-disable-line no-duplicate-imports
import type {StatusBar, Tile} from 'status-bar'
import type {ChangeType} from './git-store' // eslint-disable-line no-duplicate-imports

type GitState = {panelVisible: boolean}

type GitPushFunction = () => Promise<void>

import type {GitHubService} from '../github/github-service'

export default class GitPackage {
  subscriptions: CompositeDisposable;
  gitStoreChangeSubscription: Disposable;
  state: GitState;
  changesPanel: ?Panel<FileListViewModel>;
  statusBarTile: ?Tile<GitStatusBarComponent>;
  fileListComponent: ?FileListComponent;
  statusBarComponent: ?GitStatusBarComponent;
  activeGitRepository: GitRepository;
  token: ?string;
  gitStoresByRepository: WeakMap<GitRepositoryAsync, GitStore>;
  fileListViewModelsByGitStore: Map<GitStore, FileListViewModel>;
  statusBarViewModelsByGitStore: Map<GitStore, GitStatusBarViewModel>;
  gitHubService: GitHubService;

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
  }

  constructor () {
    this.subscriptions = new CompositeDisposable()
    this.gitStoresByRepository = new WeakMap()
    this.fileListViewModelsByGitStore = new Map()
    this.statusBarViewModelsByGitStore = new Map()
    this.gitHubService = {getToken: () => null}
  }

  activate (state: GitState = {panelVisible: false}): void {
    this.state = state

    if (!this.hasRepository()) return

    atom.commands.add('atom-workspace', 'git:view-and-commit-changes', () => {
      this.toggleChangesPanel()
    })

    atom.commands.add('atom-workspace', 'git:close-all', () => this.closeAll())
    atom.commands.add('atom-workspace', 'git:open-file-diff', () => this.openDiffForActiveEditor())
    atom.commands.add('atom-workspace', 'git:refresh-status', async () => this.update(await this.getActiveGitStore(), 'reload'))
    atom.commands.add('atom-workspace', 'git:create-branch', () => this.createBranch())

    if (state.panelVisible) {
      this.openChangesPanel()
    }

    this.subscriptions.add(atom.workspace.observeActivePaneItem(this.setActivePaneItem.bind(this)))

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

  async createBranch (): Promise {
    const viewModel = new BranchViewModel(await this.getActiveGitStore())
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

  async setActivePaneItem (item: any): Promise {
    let repository

    if (item && typeof item.getPath === 'function') {
      const projectPath = atom.project.relativizePath(item.getPath())[0]
      if (projectPath) {
        repository = await atom.project.repositoryForDirectory(new Directory(projectPath))
      }
    }

    if (!repository) repository = atom.project.getRepositories()[0]

    if (repository !== this.activeGitRepository) {
      this.setActiveGitRepository(repository)
    }
  }

  async setActiveGitRepository (repository: GitRepository): Promise {
    this.activeGitRepository = repository

    if (this.gitStoreChangeSubscription) this.gitStoreChangeSubscription.dispose()

    const gitStore = this.gitStoreForRepository(repository)

    this.gitStoreChangeSubscription = gitStore.onDidChange(({changeType}) => {
      this.update(gitStore, changeType)
    })

    this.subscriptions.add(new Disposable(() => {
      gitStore.getGitService().destroy()
      gitStore.destroy()
      this.gitStoresByRepository.delete(repository)
    }))

    await gitStore.loadFromGit()

    const fileListViewModel = this.fileListViewModelForGitStore(gitStore)
    if (this.fileListComponent) {
      this.fileListComponent.update({fileListViewModel})
    } else {
      this.fileListComponent = new FileListComponent({fileListViewModel}, () => this.toggleChangesPanel())
    }

    const statusBarViewModel = this.statusBarViewModelForGitStore(gitStore)
    if (this.statusBarComponent) {
      this.statusBarComponent.update({statusBarViewModel})
    } else {
      this.statusBarComponent = new GitStatusBarComponent({statusBarViewModel}, () => this.toggleChangesPanel())
    }
  }

  gitStoreForRepository (repository: GitRepositoryAsync): GitStore {
    let gitStore = this.gitStoresByRepository.get(repository)
    if (gitStore == null) {
      gitStore = new GitStore(new GitService(repository))
      this.gitStoresByRepository.set(repository, gitStore)
    }
    return gitStore
  }

  getActiveGitStore (): GitStore {
    return this.gitStoreForRepository(this.activeGitRepository)
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
    const component = await this.getFileListComponent()
    const changesPanel = this.changesPanel
    if (changesPanel) {
      changesPanel.show()
    } else {
      this.changesPanel = atom.workspace.addRightPanel({item: component})
    }

    const viewModel = component.getViewModel()
  }

  async openDiffForActiveEditor (): Promise {
    const editor = atom.workspace.getActiveTextEditor()
    const editorPath = editor.getPath()
    const fileListComponent = this.fileListComponent

    if (!editorPath) return
    if (!fileListComponent) return

    const filePath = atom.project.relativizePath(editorPath)[1]
    const viewModel = fileListComponent.getViewModel()
    const diff = viewModel.getDiffForPathName(filePath)
    return diff.openDiff({pending: true})
  }

  fileListViewModelForGitStore (gitStore: GitStore): FileListViewModel {
    let fileListViewModel = this.fileListViewModelsByGitStore.get(gitStore)
    if (fileListViewModel == null) {
      fileListViewModel = new FileListViewModel(gitStore)
      this.fileListViewModelsByGitStore.set(gitStore, fileListViewModel)
      this.subscriptions.add(new Disposable(() => {
        // $FlowFixMe: fileListViewModel is always non-null.
        fileListViewModel.destroy()
      }))
    }

    return fileListViewModel
  }

  statusBarViewModelForGitStore (gitStore: GitStore): GitStatusBarViewModel {
    let statusBarViewModel = this.statusBarViewModelsByGitStore.get(gitStore)
    if (statusBarViewModel == null) {
      statusBarViewModel = new GitStatusBarViewModel(gitStore)
      this.statusBarViewModelsByGitStore.set(gitStore, statusBarViewModel)
      this.subscriptions.add(new Disposable(() => {
        // $FlowFixMe: statusBarViewModel is always non-null.
        statusBarViewModel.destroy()
      }))
    }

    return statusBarViewModel
  }

  async consumeStatusBar (statusBar: StatusBar): Promise {
    this.statusBar = statusBar
    // if (!this.hasRepository()) return
    //
    // const component = await this.getStatusBarComponent()
    // const tile = statusBar.addRightTile({item: component, priority: -100})
    // this.subscriptions.add(new Disposable(() => tile.destroy()))
    // this.statusBarTile = tile
  }

  async consumeGitHub (github: GitHubService): Promise {
    this.github = github

    // if (!this.hasRepository()) return
    // this.gitHubService = github
    //
    // for (let [gitStore, viewModel] of this.fileListViewModelsByGitStore) {
    //   viewModel.setGitHubService(this.gitHubService)
    // }
  }

  provideGitPush (): ?GitPushFunction {
    if (!this.hasRepository()) return null

    // return async () => {
    //   const viewModel = await this.getActiveFileListViewModel()
    //   return viewModel.push()
    // }
  }

  async createDiffPaneItem ({uri, pending}: {uri: string, pending: boolean}): Promise<DiffViewModel> {
    const fileListComponent = this.fileListComponent
    const pathName = uri.replace(DiffURI, '')
    const gitStore = await this.getActiveGitStore()
    // $FlowFixMe
    const fileListViewModel = await this.fileListComponent.viewModel
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
