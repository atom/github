/** @jsx etch.dom */
/* eslint react/no-unknown-property: "off" */

import path from 'path';
import fs from 'fs';
import etch from 'etch';

import GitPanelView from '../views/git-panel-view';
import ModelObserver from '../models/model-observer';
import Conflict from '../models/conflicts/conflict';
import {autobind} from 'core-decorators';

export default class GitPanelController {
  constructor(props) {
    this.props = props;
    this.stagingOperationInProgress = false;

    this.repositoryObserver = new ModelObserver({
      fetchData: this.fetchRepositoryData,
      didUpdate: () => {
        this.refreshResolutionProgress(false, false);
        etch.update(this);
      },
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
        resolutionProgress={this.props.resolutionProgress}
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
        openFiles={this.props.openFiles}
        discardWorkDirChangesForPaths={this.props.discardWorkDirChangesForPaths}
        attemptFileStageOperation={this.attemptFileStageOperation}
        prepareToCommit={this.prepareToCommit}
        commit={this.commit}
        setAmending={this.setAmending}
        isAmending={this.props.isAmending}
        abortMerge={this.abortMerge}
        resolveAsOurs={this.resolveAsOurs}
        resolveAsTheirs={this.resolveAsTheirs}
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

  @autobind
  async fetchRepositoryData(repository) {
    const dataPromises = {
      mergeConflicts: repository.getMergeConflicts(),
      lastCommit: repository.getLastCommit(),
      isMerging: repository.isMerging(),
      isRebasing: repository.isRebasing(),
      branchName: repository.getCurrentBranch(),
      branches: repository.getBranches(),
      remoteName: repository.getRemoteForBranch(this.branchName),
      unstagedChanges: repository.getUnstagedChanges(),
      stagedChanges: this.fetchStagedChanges(repository),
    };
    const data = {
      unstagedChanges: await dataPromises.unstagedChanges,
      stagedChanges: await dataPromises.stagedChanges,
      mergeConflicts: await dataPromises.mergeConflicts,
      lastCommit: await dataPromises.lastCommit,
      isMerging: await dataPromises.isMerging,
      isRebasing: await dataPromises.isRebasing,
      branchName: await dataPromises.branchName,
      branches: await dataPromises.branches,
      mergeMessage: null,
      aheadCount: null,
      behindCount: null,
      remoteName: await dataPromises.remoteName,
      workingDirectoryPath: repository.getWorkingDirectoryPath(),
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

  /*
   * Begin (but don't await) an async conflict-counting task for each merge conflict path that has no conflict
   * marker count yet. Omit any path that's already open in a TextEditor or that has already been counted.
   *
   * includeOpen - update marker counts for files that are currently open in TextEditors
   * includeCounts - update marker counts for files that have been counted before
   */
  refreshResolutionProgress(includeOpen, includeCounted) {
    const data = this.repositoryObserver.getActiveModelData();
    if (!data) {
      return;
    }

    const openPaths = new Set(
      this.props.workspace.getTextEditors().map(editor => editor.getPath()),
    );
    for (let i = 0; i < data.mergeConflicts.length; i++) {
      const conflictPath = path.join(data.workingDirectoryPath, data.mergeConflicts[i].filePath);

      if (!includeOpen && openPaths.has(conflictPath)) {
        continue;
      }

      if (!includeCounted && this.props.resolutionProgress.getRemaining(conflictPath) === undefined) {
        continue;
      }

      const readStream = fs.createReadStream(conflictPath, {encoding: 'utf8'});
      Conflict.countFromStream(readStream).then(count => {
        this.props.resolutionProgress.reportMarkerCount(conflictPath, count);
      });
    }
  }

  unstageFilePatch(filePatch) {
    return this.getActiveRepository().applyPatchToIndex(filePatch.getUnstagePatch());
  }

  @autobind
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

  @autobind
  unstageFiles(filePaths) {
    const repository = this.getActiveRepository();
    if (this.props.isAmending) {
      return repository.stageFilesFromParentCommit(filePaths);
    } else {
      return repository.unstageFiles(filePaths);
    }
  }

  @autobind
  async prepareToCommit() {
    return !await this.props.ensureGitPanel();
  }

  @autobind
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

  @autobind
  setAmending(isAmending) {
    this.props.didChangeAmending(isAmending);
  }

  @autobind
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

  @autobind
  async resolveAsOurs(paths) {
    const data = this.repositoryObserver.getActiveModelData();
    if (!data) {
      return;
    }
    const side = data.isRebasing ? 'theirs' : 'ours';
    await this.getActiveRepository().checkoutSide(side, paths);
    this.refreshResolutionProgress(true, true);
  }

  @autobind
  async resolveAsTheirs(paths) {
    const data = this.repositoryObserver.getActiveModelData();
    if (!data) {
      return;
    }
    const side = data.isRebasing ? 'ours' : 'theirs';
    await this.getActiveRepository().checkoutSide(side, paths);
    this.refreshResolutionProgress(true, true);
  }

  @autobind
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

  @autobind
  quietlySelectItem(filePath, stagingStatus) {
    return this.refs.gitPanel.quitelySelectItem(filePath, stagingStatus);
  }
}
