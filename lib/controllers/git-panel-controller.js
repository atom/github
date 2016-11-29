/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

import GitPanelView from '../views/git-panel-view'
import ModelObserver from '../models/model-observer'

export default class GitPanelController {
  constructor (props) {
    this.props = props
    this.unstageFilePatch = this.unstageFilePatch.bind(this)
    this.stageFiles = this.stageFiles.bind(this)
    this.unstageFiles = this.unstageFiles.bind(this)
    this.commit = this.commit.bind(this)
    this.setAmending = this.setAmending.bind(this)
    this.checkout = this.checkout.bind(this)
    this.abortMerge = this.abortMerge.bind(this)
    this.viewStateByRepository = new WeakMap()
    this.repositoryObserver = new ModelObserver({
      fetchData: this.fetchRepositoryData.bind(this),
      didUpdate: () => etch.update(this)
    })
    this.repositoryObserver.setActiveModel(props.repository)
    etch.initialize(this)
  }

  viewStateForRepository (repository) {
    if (repository) {
      if (!this.viewStateByRepository.has(repository)) {
        this.viewStateByRepository.set(repository, {})
      }
      return this.viewStateByRepository.get(repository)
    }
  }

  render () {
    const viewState = this.viewStateForRepository(this.getActiveRepository())
    const modelData = this.repositoryObserver.getActiveModelData() || {fetchInProgress: true}
    return (
      <GitPanelView
        ref='gitPanel'
        {...modelData}
        repository={this.props.repository}
        viewState={viewState}
        workspace={this.props.workspace}
        commandRegistry={this.props.commandRegistry}
        notificationManager={this.props.notificationManager}
        didSelectFilePath={this.props.didSelectFilePath}
        didSelectMergeConflictFile={this.props.didSelectMergeConflictFile}
        focusFilePatchView={this.props.focusFilePatchView}
        stageFilePatch={this.stageFilePatch}
        unstageFilePatch={this.unstageFilePatch}
        stageFiles={this.stageFiles}
        unstageFiles={this.unstageFiles}
        commit={this.commit}
        setAmending={this.setAmending}
        isAmending={this.isAmending}
        abortMerge={this.abortMerge}
        push={this.push}
        pull={this.pull}
        fetch={this.fetch}
        checkout={this.checkout}
      />
    )
  }

  async update (props) {
    const oldProps = this.props
    this.props = Object.assign({}, this.props, props)
    if (this.props.repository !== oldProps.repository) {
      await this.repositoryObserver.setActiveModel(props.repository)
    }
    return etch.update(this)
  }

  destroy () {
    this.repositoryObserver.destroy()
  }

  getLastModelDataRefreshPromise () {
    return this.repositoryObserver.getLastModelDataRefreshPromise()
  }

  getActiveRepository () {
    return this.repositoryObserver.getActiveModel()
  }

  refreshModelData () {
    return this.repositoryObserver.refreshModelData()
  }

  async fetchRepositoryData (repository) {
    const data = {
      unstagedChanges: await repository.getUnstagedChanges(),
      stagedChanges: await this.fetchStagedChanges(repository),
      mergeConflicts: await repository.getMergeConflicts(),
      lastCommit: await repository.getLastCommit(),
      isMerging: await repository.isMerging(),
      branchName: await repository.getCurrentBranch(),
      branches: await repository.getBranches(),
      aheadCount: null,
      behindCount: null,
      remoteName: await repository.getRemoteForBranch(this.branchName)
    }

    if (data.remoteName) {
      data.aheadCount = await repository.getAheadCount(data.branchName)
      data.behindCount = await repository.getBehindCount(this.branchName)
    }

    if (data.isMerging) {
      data.mergeMessage = await repository.getMergeMessage()
    }

    return data
  }

  fetchStagedChanges (repository) {
    if (this.isAmending) {
      return repository.getStagedChangesSinceParentCommit()
    } else {
      return repository.getStagedChanges()
    }
  }

  unstageFilePatch (filePatch) {
    return this.getActiveRepository().applyPatchToIndex(filePatch.getUnstagePatch())
  }

  async stageFiles (filePaths) {
    const pathsToIgnore = []
    const repository = this.getActiveRepository()
    for (let filePath of filePaths) {
      if (await repository.pathHasMergeMarkers(filePath)) { // eslint-disable-line babel/no-await-in-loop
        const choice = atom.confirm({
          message: 'File contains merge markers: ',
          detailedMessage: `Do you still want to stage this file?\n${filePath}`,
          buttons: ['Stage', 'Cancel']
        })
        if (choice !== 0) pathsToIgnore.push(filePath)
      }
    }
    const pathsToStage = filePaths.filter(filePath => !pathsToIgnore.includes(filePath))
    return repository.stageFiles(pathsToStage)
  }

  unstageFiles (filePaths) {
    const repository = this.getActiveRepository()
    if (this.isAmending) {
      return repository.stageFilesFromParentCommit(filePaths)
    } else {
      return repository.unstageFiles(filePaths)
    }
  }

  async commit (message, options) {
    await this.getActiveRepository().commit(message, options)
    this.setAmending(false)
  }

  setAmending (isAmending) {
    if (this.props.didChangeAmending) this.props.didChangeAmending(isAmending)
    this.isAmending = isAmending
    return this.repositoryObserver.refreshModelData(this.getActiveRepository())
  }

  abortMerge () {
    return this.getActiveRepository().abortMerge()
  }

  checkout (branchName, options) {
    return this.getActiveRepository().checkout(branchName, options)
  }

  focus () {
    if (this.refs.gitPanel) this.refs.gitPanel.focus()
  }
}
