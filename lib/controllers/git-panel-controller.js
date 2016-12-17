/** @jsx etch.dom */
/* eslint react/no-unknown-property: "off" */

import etch from 'etch';

import GitPanelView from '../views/git-panel-view';
import ModelObserver from '../models/model-observer';

export default class GitPanelController {
  constructor(props) {
    this.props = props;
    this.stagingOperationInProgress = false;

    this.unstageFilePatch = this.unstageFilePatch.bind(this);
    this.attemptFileStageOperation = this.attemptFileStageOperation.bind(this);
    this.commit = this.commit.bind(this);
    this.setAmending = this.setAmending.bind(this);
    this.checkout = this.checkout.bind(this);
    this.abortMerge = this.abortMerge.bind(this);
    this.repositoryObserver = new ModelObserver({
      fetchData: this.fetchRepositoryData.bind(this),
      didUpdate: () => etch.update(this),
    });
    this.repositoryObserver.setActiveModel(props.repository);
    etch.initialize(this);
  }

  render() {
    const modelData = this.repositoryObserver.getActiveModelData() || {fetchInProgress: true};
    return (
      <GitPanelView
        ref="gitPanel"
        {...modelData}
        repository={this.props.repository}
        workspace={this.props.workspace}
        commandRegistry={this.props.commandRegistry}
        notificationManager={this.props.notificationManager}
        didSelectFilePath={this.props.didSelectFilePath}
        didDiveIntoFilePath={this.props.didDiveIntoFilePath}
        didSelectMergeConflictFile={this.props.didSelectMergeConflictFile}
        didDiveIntoMergeConflictPath={this.props.didDiveIntoMergeConflictPath}
        focusFilePatchView={this.props.focusFilePatchView}
        stageFilePatch={this.stageFilePatch}
        unstageFilePatch={this.unstageFilePatch}
        attemptFileStageOperation={this.attemptFileStageOperation}
        commit={this.commit}
        setAmending={this.setAmending}
        isAmending={this.props.isAmending}
        abortMerge={this.abortMerge}
        push={this.push}
        pull={this.pull}
        fetch={this.fetch}
        checkout={this.checkout}
      />
    );
  }

  async update(props) {
    const oldProps = this.props;
    this.props = {...this.props, ...props};
    if (this.props.repository !== oldProps.repository) {
      await this.repositoryObserver.setActiveModel(props.repository);
    } else if (this.props.isAmending !== oldProps.isAmending) {
      await this.repositoryObserver.refreshModelData(this.getActiveRepository());
    }
    return etch.update(this);
  }

  destroy() {
    this.repositoryObserver.destroy();
  }

  getLastModelDataRefreshPromise() {
    return this.repositoryObserver.getLastModelDataRefreshPromise();
  }

  getActiveRepository() {
    return this.repositoryObserver.getActiveModel();
  }

  refreshModelData() {
    return this.repositoryObserver.refreshModelData();
  }

  async fetchRepositoryData(repository) {
    const data = {
      unstagedChanges: await repository.getUnstagedChanges(),
      stagedChanges: await this.fetchStagedChanges(repository),
      mergeConflicts: await repository.getMergeConflicts(),
      lastCommit: await repository.getLastCommit(),
      isMerging: await repository.isMerging(),
      branchName: await repository.getCurrentBranch(),
      branches: await repository.getBranches(),
      mergeMessage: null,
      aheadCount: null,
      behindCount: null,
      remoteName: await repository.getRemoteForBranch(this.branchName),
    };

    if (data.remoteName) {
      data.aheadCount = await repository.getAheadCount(data.branchName);
      data.behindCount = await repository.getBehindCount(this.branchName);
    }

    if (data.isMerging) {
      data.mergeMessage = await repository.getMergeMessage();
    }

    return data;
  }

  fetchStagedChanges(repository) {
    if (this.props.isAmending) {
      return repository.getStagedChangesSinceParentCommit();
    } else {
      return repository.getStagedChanges();
    }
  }

  unstageFilePatch(filePatch) {
    return this.getActiveRepository().applyPatchToIndex(filePatch.getUnstagePatch());
  }

  attemptFileStageOperation(filePaths, stageStatus) {
    if (this.stagingOperationInProgress) {
      return {
        stageOperationPromise: Promise.resolve(),
        selectionUpdatePromise: Promise.resolve(),
      };
    }

    this.stagingOperationInProgress = true;

    const fileListUpdatePromise = this.refs.gitPanel.refs.stagingView.getNextListUpdatePromise();
    let stageOperationPromise;
    if (stageStatus === 'staged') {
      stageOperationPromise = this.unstageFiles(filePaths);
    } else {
      stageOperationPromise = this.stageFiles(filePaths);
    }
    const selectionUpdatePromise = fileListUpdatePromise.then(() => {
      this.stagingOperationInProgress = false;
    });

    return {stageOperationPromise, selectionUpdatePromise};
  }

  async stageFiles(filePaths) {
    const pathsToIgnore = [];
    const repository = this.getActiveRepository();
    for (const filePath of filePaths) {
      if (await repository.pathHasMergeMarkers(filePath)) { // eslint-disable-line babel/no-await-in-loop
        const choice = atom.confirm({
          message: 'File contains merge markers: ',
          detailedMessage: `Do you still want to stage this file?\n${filePath}`,
          buttons: ['Stage', 'Cancel'],
        });
        if (choice !== 0) { pathsToIgnore.push(filePath); }
      }
    }
    const pathsToStage = filePaths.filter(filePath => !pathsToIgnore.includes(filePath));
    return repository.stageFiles(pathsToStage);
  }

  unstageFiles(filePaths) {
    const repository = this.getActiveRepository();
    if (this.props.isAmending) {
      return repository.stageFilesFromParentCommit(filePaths);
    } else {
      return repository.unstageFiles(filePaths);
    }
  }

  async commit(message) {
    try {
      await this.getActiveRepository().commit(message, {amend: this.props.isAmending});
      this.setAmending(false);
    } catch (e) {
      if (e.code === 'ECONFLICT') {
        this.props.notificationManager.addError('Cannot commit without resolving all the merge conflicts first.');
      } else {
        console.error(e); // eslint-disable-line no-console
      }
    }
  }

  setAmending(isAmending) {
    this.props.didChangeAmending(isAmending);
  }

  async abortMerge() {
    const choice = atom.confirm({
      message: 'Abort merge',
      detailedMessage: 'Are you sure?',
      buttons: ['Abort', 'Cancel'],
    });
    if (choice !== 0) { return null; }

    try {
      await this.getActiveRepository().abortMerge();
    } catch (e) {
      if (e.code === 'EDIRTYSTAGED') {
        this.props.notificationManager.addError(`Cannot abort because ${e.path} is both dirty and staged.`);
      }
    }
    return etch.update(this);
  }

  checkout(branchName, options) {
    return this.getActiveRepository().checkout(branchName, options);
  }

  focus() {
    this.refs.gitPanel.focus();
  }

  focusAndSelectStagingItem(filePath, stagingStatus) {
    return this.refs.gitPanel.focusAndSelectStagingItem(filePath, stagingStatus);
  }

  isFocused() {
    return this.refs.gitPanel.isFocused();
  }
}
