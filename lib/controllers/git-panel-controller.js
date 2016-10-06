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
    this.push = this.push.bind(this)
    this.pull = this.pull.bind(this)
    this.fetch = this.fetch.bind(this)
    this.commit = this.commit.bind(this)
    this.setAmending = this.setAmending.bind(this)
    this.checkout = this.checkout.bind(this)
    this.abortMerge = this.abortMerge.bind(this)
    this.repositoryObserver = new ModelObserver({
      fetchData: this.fetchRepositoryData.bind(this),
      didUpdate: () => etch.update(this)
    })
    this.repositoryObserver.setActiveModel(props.repository)
    etch.initialize(this)
  }

  render () {
    const modelData = this.repositoryObserver.getActiveModelData()
    if (modelData) {
      return (
        <GitPanelView
          ref='gitPanel'
          {...modelData}
          workspace={this.props.workspace}
          commandRegistry={this.props.commandRegistry}
          notificationManager={this.props.notificationManager}
          pullEnabled={this.isPullEnabled()}
          didSelectFilePatch={this.props.didSelectFilePatch}
          didSelectMergeConflictFile={this.props.didSelectMergeConflictFile}
          stageFilePatch={this.stageFilePatch}
          unstageFilePatch={this.unstageFilePatch}
          stageFiles={this.stageFiles}
          unstageFiles={this.unstageFiles}
          commit={this.commit}
          setAmending={this.setAmending}
          isMerging={this.isMerging}
          isAmending={this.isAmending}
          abortMerge={this.abortMerge}
          push={this.push}
          pull={this.pull}
          fetch={this.fetch}
          checkout={this.checkout}
        />
      )
    } else {
      return <div />
    }
  }

  update (props) {
    this.props = Object.assign({}, this.props, props)
    return this.repositoryObserver.setActiveModel(props.repository)
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
      remoteName: await repository.getRemote(this.branchName)
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

  push () {
    return this.getActiveRepository().push(this.branchName)
  }

  pull () {
    if (this.isPullEnabled()) {
      return this.getActiveRepository().pull(this.branchName)
    } else {
      return Promise.resolve()
    }
  }

  fetch () {
    return this.getActiveRepository().fetch(this.branchName)
  }

  isPullEnabled () {
    const repository = this.getActiveRepository()
    return this.fetchStagedChanges(repository).length === 0 && repository.getUnstagedChanges().length === 0
  }

  async commit (message, options) {
    await this.getActiveRepository().commit(message, options)
    this.setAmending(false)
  }

  setAmending (isAmending) {
    if (this.props.didChangeAmending) this.props.didChangeAmending()
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
