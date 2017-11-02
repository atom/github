/** @jsx etch.dom */
/* eslint react/no-unknown-property: "off" */

import path from 'path';
import etch from 'etch';
import {Disposable} from 'event-kit';

import GitTabView from '../views/git-tab-view';
import ModelObserver from '../models/model-observer';
import {nullBranch} from '../models/branch';
import {nullCommit} from '../models/commit';
import {autobind} from 'core-decorators';
import yubikiri from 'yubikiri';

export default class GitTabController {
  static focus = {
    ...GitTabView.focus,
  };

  constructor(props) {
    this.props = props;
    this.stagingOperationInProgress = false;
    this.lastFocus = GitTabView.focus.STAGING;

    this.repositoryObserver = new ModelObserver({
      fetchData: this.fetchRepositoryData,
      didUpdate: () => {
        this.refreshResolutionProgress(false, false);
        return this.update();
      },
    });
    this.repositoryObserver.setActiveModel(props.repository);
    etch.initialize(this);

    this.element.addEventListener('focusin', this.rememberLastFocus);
    this.subscriptions = new Disposable(() => this.element.removeEventListener('focusin', this.rememberLastFocus));
  }

  serialize() {
    return {
      deserializer: 'GithubDockItem',
      uri: this.getURI(),
    };
  }

  render() {
    const modelData = this.repositoryObserver.getActiveModelData() || this.defaultRepositoryData();
    const hasUndoHistory = this.props.repository ? this.hasUndoHistory() : false;
    const isAmending = this.isAmending();
    return (
      <GitTabView
        ref="gitTab"
        {...modelData}
        repository={this.props.repository}
        resolutionProgress={this.props.resolutionProgress}
        workspace={this.props.workspace}
        commandRegistry={this.props.commandRegistry}
        grammars={this.props.grammars}
        notificationManager={this.props.notificationManager}
        project={this.props.project}
        confirm={this.props.confirm}
        initializeRepo={this.props.initializeRepo}
        didSelectFilePath={this.props.didSelectFilePath}
        stageFilePatch={this.stageFilePatch}
        unstageFilePatch={this.unstageFilePatch}
        openFiles={this.props.openFiles}
        discardWorkDirChangesForPaths={this.props.discardWorkDirChangesForPaths}
        attemptFileStageOperation={this.attemptFileStageOperation}
        prepareToCommit={this.prepareToCommit}
        commit={this.commit}
        isAmending={isAmending}
        hasUndoHistory={hasUndoHistory}
        undoLastDiscard={this.props.undoLastDiscard}
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
    }
    return etch.update(this);
  }

  destroy() {
    this.subscriptions.dispose();
    this.repositoryObserver.destroy();
  }

  getTitle() {
    return 'Git';
  }

  getIconName() {
    return 'git-commit';
  }

  getDefaultLocation() {
    return 'right';
  }

  getPreferredWidth() {
    return 400;
  }

  getURI() {
    return 'atom-github://dock-item/git';
  }

  getWorkingDirectory() {
    return this.props.repository.getWorkingDirectoryPath();
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
  fetchRepositoryData(repository) {
    return yubikiri({
      lastCommit: repository.getLastCommit(),
      isMerging: repository.isMerging(),
      isRebasing: repository.isRebasing(),
      currentBranch: repository.getCurrentBranch(),
      unstagedChanges: repository.getUnstagedChanges(),
      stagedChanges: this.fetchStagedChanges(repository),
      mergeConflicts: repository.getMergeConflicts(),
      workingDirectoryPath: repository.getWorkingDirectoryPath(),
      mergeMessage: async query => {
        const isMerging = await query.isMerging;
        return isMerging ? repository.getMergeMessage() : null;
      },
      fetchInProgress: Promise.resolve(false),
    });
  }

  defaultRepositoryData() {
    return {
      lastCommit: nullCommit,
      isMerging: false,
      isRebasing: false,
      currentBranch: nullBranch,
      unstagedChanges: [],
      stagedChanges: [],
      mergeConflicts: [],
      workingDirectoryPath: this.props.repository.getWorkingDirectoryPath(),
      mergeMessage: null,
      fetchInProgress: true,
    };
  }

  fetchStagedChanges(repository) {
    if (this.isAmending()) {
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

      if (!includeCounted && this.props.resolutionProgress.getRemaining(conflictPath) !== undefined) {
        continue;
      }

      this.props.refreshResolutionProgress(conflictPath);
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

    const fileListUpdatePromise = this.refs.gitTab.refs.stagingView.getNextListUpdatePromise();
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
      if (await repository.pathHasMergeMarkers(filePath)) { // eslint-disable-line no-await-in-loop
        const choice = this.props.confirm({
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
    if (this.isAmending()) {
      return repository.stageFilesFromParentCommit(filePaths);
    } else {
      return repository.unstageFiles(filePaths);
    }
  }

  @autobind
  async prepareToCommit() {
    return !await this.props.ensureGitTab();
  }

  @autobind
  commit(message) {
    return this.getActiveRepository().commit(message, {amend: this.isAmending()});
  }

  @autobind
  async abortMerge() {
    const choice = this.props.confirm({
      message: 'Abort merge',
      detailedMessage: 'Are you sure?',
      buttons: ['Abort', 'Cancel'],
    });
    if (choice !== 0) { return null; }

    try {
      await this.getActiveRepository().abortMerge();
    } catch (e) {
      if (e.code === 'EDIRTYSTAGED') {
        this.props.notificationManager.addError(
          `Cannot abort because ${e.path} is both dirty and staged.`,
          {dismissable: true},
        );
      } else {
        throw e;
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
    this.refreshResolutionProgress(false, true);
  }

  @autobind
  async resolveAsTheirs(paths) {
    const data = this.repositoryObserver.getActiveModelData();
    if (!data) {
      return;
    }
    const side = data.isRebasing ? 'ours' : 'theirs';
    await this.getActiveRepository().checkoutSide(side, paths);
    this.refreshResolutionProgress(false, true);
  }

  @autobind
  checkout(branchName, options) {
    return this.getActiveRepository().checkout(branchName, options);
  }

  @autobind
  isAmending() {
    return this.getActiveRepository().isAmending();
  }

  @autobind
  rememberLastFocus(event) {
    this.lastFocus = this.refs.gitTab.rememberFocus(event) || GitTabView.focus.STAGING;
  }

  restoreFocus() {
    this.refs.gitTab.setFocus(this.lastFocus);
  }

  hasFocus() {
    return this.element.contains(document.activeElement);
  }

  wasActivated(isStillActive) {
    process.nextTick(() => {
      isStillActive() && this.restoreFocus();
    });
  }

  focusAndSelectStagingItem(filePath, stagingStatus) {
    return this.refs.gitTab.focusAndSelectStagingItem(filePath, stagingStatus);
  }

  @autobind
  quietlySelectItem(filePath, stagingStatus) {
    return this.refs.gitTab.quietlySelectItem(filePath, stagingStatus);
  }

  @autobind
  hasUndoHistory() {
    return this.props.repository.hasDiscardHistory();
  }
}
