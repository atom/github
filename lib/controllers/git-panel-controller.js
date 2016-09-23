/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

import GitPanelView from '../views/git-panel-view'

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
    this.setAmendMode = this.setAmendMode.bind(this)
    this.checkout = this.checkout.bind(this)
    this.abortMerge = this.abortMerge.bind(this)
    this.switchRepository(props.repository)
    etch.initialize(this)
  }

  render () {
    if (this.repository) {
      return (
        <GitPanelView
          ref='gitPanel'
          workspace={this.props.workspace}
          commandRegistry={this.props.commandRegistry}
          notificationManager={this.props.notificationManager}
          unstagedChanges={this.unstagedChanges}
          stagedChanges={this.stagedChanges}
          mergeConflicts={this.mergeConflicts}
          mergeMessage={this.mergeMessage}
          branchName={this.branchName}
          branches={this.branches}
          checkout={this.checkout}
          remoteName={this.remoteName}
          aheadCount={this.aheadCount}
          behindCount={this.behindCount}
          pullEnabled={this.isPullEnabled()}
          didSelectFilePatch={this.props.didSelectFilePatch}
          didSelectMergeConflictFile={this.props.didSelectMergeConflictFile}
          stageFilePatch={this.stageFilePatch}
          unstageFilePatch={this.unstageFilePatch}
          stageFiles={this.stageFiles}
          unstageFiles={this.unstageFiles}
          commit={this.commit}
          setAmendMode={this.setAmendMode}
          isMerging={this.isMerging}
          isAmending={this.isAmending}
          abortMerge={this.abortMerge}
          push={this.push}
          pull={this.pull}
          fetch={this.fetch}
          lastCommit={this.lastCommit}
        />
      )
    } else {
      return <div />
    }
  }

  update (props) {
    this.props = Object.assign({}, this.props, props)
    return this.switchRepository(props.repository)
  }

  switchRepository (repository) {
    if (repository !== this.repository) {
      if (this.repositorySubscription) {
        this.repositorySubscription.dispose()
        this.repositorySubscription = null
      }
      if (repository) {
        this.repositorySubscription = repository.onDidUpdate(() => this.refreshModelData(repository))
      }

      return this.refreshModelData(repository)
    }
  }

  refreshModelData (repository) {
    this.lastModelDataRefreshPromise = this._refreshModelData(repository)
    return this.lastModelDataRefreshPromise
  }

  async _refreshModelData (repository) {
    if (repository) {
      this.unstagedChanges = await repository.getUnstagedChanges()
      await this._refreshStagedChanges(repository)
      this.mergeConflicts = await repository.getMergeConflicts()
      this.lastCommit = await repository.getLastCommit()
      this.isMerging = await repository.isMerging()
      if (this.isMerging) {
        this.mergeMessage = await repository.getMergeMessage()
      }
      this.branchName = await repository.getCurrentBranch()
      this.branches = await repository.getBranches()
      this.aheadCount = null
      this.behindCount = null
      this.remoteName = await repository.getRemote(this.branchName)
      if (this.remoteName) {
        // TODO: re-enable this when authentication works
        // await repository.fetch(branchName)
        this.aheadCount = await repository.getAheadCount(this.branchName)
        this.behindCount = await repository.getBehindCount(this.branchName)
      }
    }

    this.repository = repository
    return etch.update(this)
  }

  async _refreshStagedChanges (repository) {
    if (this.isAmending) {
      this.stagedChanges = await repository.getStagedChangesSinceParentCommit()
    } else {
      this.stagedChanges = await repository.getStagedChanges()
    }
  }

  unstageFilePatch (filePatch) {
    return this.repository.applyPatchToIndex(filePatch.getUnstagePatch())
  }

  async stageFiles (filePaths) {
    const pathsToIgnore = []
    for (let filePath of filePaths) {
      if (await this.repository.pathHasMergeMarkers(filePath)) { // eslint-disable-line babel/no-await-in-loop
        const choice = atom.confirm({
          message: 'File contains merge markers: ',
          detailedMessage: `Do you still want to stage this file?\n${filePath}`,
          buttons: ['Stage', 'Cancel']
        })
        if (choice !== 0) pathsToIgnore.push(filePath)
      }
    }
    const pathsToStage = filePaths.filter(filePath => !pathsToIgnore.includes(filePath))
    return this.repository.stageFiles(pathsToStage)
  }

  unstageFiles (filePaths) {
    if (this.isAmending) {
      return this.repository.stageFilesFromParentCommit(filePaths)
    } else {
      return this.repository.unstageFiles(filePaths)
    }
  }

  push () {
    return this.repository.push(this.branchName)
  }

  pull () {
    if (this.isPullEnabled()) {
      return this.repository.pull(this.branchName)
    } else {
      return Promise.resolve()
    }
  }

  fetch () {
    return this.repository.fetch(this.branchName)
  }

  isPullEnabled () {
    return this.stagedChanges.length === 0 && this.unstagedChanges.length === 0
  }

  commit (message, options) {
    return this.repository.commit(message, options)
  }

  async setAmendMode (isAmending) {
    this.isAmending = isAmending
    await this._refreshStagedChanges(this.repository)
    return etch.update(this)
  }

  abortMerge () {
    return this.repository.abortMerge()
  }

  checkout (branchName, options) {
    return this.repository.checkout(branchName, options)
  }

  focus () {
    if (this.refs.gitPanel) this.refs.gitPanel.focus()
  }
}
