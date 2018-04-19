import path from 'path';

import React from 'react';
import PropTypes from 'prop-types';
import {autobind} from 'core-decorators';

import yubikiri from 'yubikiri';

import GitTabView from '../views/git-tab-view';
import ObserveModel from '../views/observe-model';
import UserStore from '../models/user-store';
import {nullBranch} from '../models/branch';
import {nullCommit} from '../models/commit';

const DEFAULT_REPO_DATA = {
  lastCommit: nullCommit,
  recentCommits: [],
  isMerging: false,
  isRebasing: false,
  hasUndoHistory: false,
  currentBranch: nullBranch,
  unstagedChanges: [],
  stagedChanges: [],
  mergeConflicts: [],
  workingDirectoryPath: '',
  mergeMessage: null,
  fetchInProgress: true,
};

export default class GitTabController extends React.Component {
  static focus = {
    ...GitTabView.focus,
  };

  static propTypes = {
    repository: PropTypes.object.isRequired,

    workspace: PropTypes.object.isRequired,
    commandRegistry: PropTypes.object.isRequired,
    grammars: PropTypes.object.isRequired,
    resolutionProgress: PropTypes.object.isRequired,
    notificationManager: PropTypes.object.isRequired,
    config: PropTypes.object.isRequired,
    project: PropTypes.object.isRequired,
    tooltips: PropTypes.object.isRequired,

    confirm: PropTypes.func.isRequired,
    ensureGitTab: PropTypes.func.isRequired,
    refreshResolutionProgress: PropTypes.func.isRequired,
    undoLastDiscard: PropTypes.func.isRequired,
    discardWorkDirChangesForPaths: PropTypes.func.isRequired,
    openFiles: PropTypes.func.isRequired,
    initializeRepo: PropTypes.func.isRequired,
  };

  constructor(props, context) {
    super(props, context);

    this.stagingOperationInProgress = false;
    this.lastFocus = GitTabView.focus.STAGING;

    this.refView = null;

    this.state = {
      mentionableUsers: [],
      selectedCoAuthors: [],
    };

    this.userStore = new UserStore({
      repository: this.props.repository,
      onDidUpdate: users => {
        this.setState({mentionableUsers: users});
      },
    });

    this.lastRepoData = DEFAULT_REPO_DATA;
  }

  serialize() {
    return {
      deserializer: 'GitDockItem',
      uri: this.getURI(),
    };
  }

  fetchData = repository => {
    return yubikiri({
      lastCommit: repository.getLastCommit(),
      recentCommits: repository.getRecentCommits({max: 10}),
      isMerging: repository.isMerging(),
      isRebasing: repository.isRebasing(),
      hasUndoHistory: repository.hasDiscardHistory(),
      currentBranch: repository.getCurrentBranch(),
      unstagedChanges: repository.getUnstagedChanges(),
      stagedChanges: repository.getStagedChanges(),
      mergeConflicts: repository.getMergeConflicts(),
      workingDirectoryPath: repository.getWorkingDirectoryPath(),
      mergeMessage: async query => {
        const isMerging = await query.isMerging;
        return isMerging ? repository.getMergeMessage() : null;
      },
      fetchInProgress: false,
    });
  }

  render() {
    return (
      <ObserveModel model={this.props.repository} fetchData={this.fetchData}>
        {data => this.renderWithData(data || DEFAULT_REPO_DATA)}
      </ObserveModel>
    );
  }

  renderWithData = repoData => {
    this.lastRepoData = repoData;

    return (
      <GitTabView
        ref={c => { this.refView = c; }}

        isLoading={repoData.fetchInProgress}
        repository={this.props.repository}

        lastCommit={repoData.lastCommit}
        recentCommits={repoData.recentCommits}
        isMerging={repoData.isMerging}
        isRebasing={repoData.isRebasing}
        hasUndoHistory={repoData.hasUndoHistory}
        currentBranch={repoData.currentBranch}
        unstagedChanges={repoData.unstagedChanges}
        stagedChanges={repoData.stagedChanges}
        mergeConflicts={repoData.mergeConflicts}
        workingDirectoryPath={repoData.workingDirectoryPath}
        mergeMessage={repoData.mergeMessage}
        mentionableUsers={this.state.mentionableUsers}
        selectedCoAuthors={this.state.selectedCoAuthors}
        updateSelectedCoAuthors={this.updateSelectedCoAuthors}

        resolutionProgress={this.props.resolutionProgress}
        workspace={this.props.workspace}
        commandRegistry={this.props.commandRegistry}
        grammars={this.props.grammars}
        tooltips={this.props.tooltips}
        notificationManager={this.props.notificationManager}
        project={this.props.project}
        confirm={this.props.confirm}
        config={this.props.config}

        initializeRepo={this.props.initializeRepo}
        openFiles={this.props.openFiles}
        discardWorkDirChangesForPaths={this.props.discardWorkDirChangesForPaths}
        undoLastDiscard={this.props.undoLastDiscard}

        stageFilePatch={this.stageFilePatch}
        unstageFilePatch={this.unstageFilePatch}
        attemptFileStageOperation={this.attemptFileStageOperation}
        attemptStageAllOperation={this.attemptStageAllOperation}
        prepareToCommit={this.prepareToCommit}
        commit={this.commit}
        undoLastCommit={this.undoLastCommit}
        push={this.push}
        pull={this.pull}
        fetch={this.fetch}
        checkout={this.checkout}
        abortMerge={this.abortMerge}
        resolveAsOurs={this.resolveAsOurs}
        resolveAsTheirs={this.resolveAsTheirs}
      />
    );
  }

  componentDidMount() {
    this.refreshResolutionProgress(false, false);
    this.refView.refRoot.addEventListener('focusin', this.rememberLastFocus);
  }

  componentDidUpdate() {
    this.refreshResolutionProgress(false, false);
  }

  componentWillReceiveProps(newProps) {
    if (this.props.repository !== newProps.repository) {
      this.userStore = new UserStore({
        repository: newProps.repository,
        onDidUpdate: users => {
          this.setState({mentionableUsers: users});
        },
      });
    }
  }

  componentWillUnmount() {
    this.refView.refRoot.removeEventListener('focusin', this.rememberLastFocus);
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

  /*
   * Begin (but don't await) an async conflict-counting task for each merge conflict path that has no conflict
   * marker count yet. Omit any path that's already open in a TextEditor or that has already been counted.
   *
   * includeOpen - update marker counts for files that are currently open in TextEditors
   * includeCounted - update marker counts for files that have been counted before
   */
  refreshResolutionProgress(includeOpen, includeCounted) {
    if (this.lastRepoData.fetchInProgress) {
      return;
    }

    const openPaths = new Set(
      this.props.workspace.getTextEditors().map(editor => editor.getPath()),
    );

    for (let i = 0; i < this.lastRepoData.mergeConflicts.length; i++) {
      const conflictPath = path.join(
        this.lastRepoData.workingDirectoryPath,
        this.lastRepoData.mergeConflicts[i].filePath,
      );

      if (!includeOpen && openPaths.has(conflictPath)) {
        continue;
      }

      if (!includeCounted && this.props.resolutionProgress.getRemaining(conflictPath) !== undefined) {
        continue;
      }

      this.props.refreshResolutionProgress(conflictPath);
    }
  }

  @autobind
  unstageFilePatch(filePatch) {
    return this.props.repository.applyPatchToIndex(filePatch.getUnstagePatch());
  }

  @autobind
  attemptStageAllOperation(stageStatus) {
    return this.attemptFileStageOperation(['.'], stageStatus);
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

    const fileListUpdatePromise = this.refView.refStagingView.getWrappedComponent().getNextListUpdatePromise();
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
    const pathsToStage = new Set(filePaths);

    const mergeMarkers = await Promise.all(
      filePaths.map(async filePath => {
        return {
          filePath,
          hasMarkers: await this.props.repository.pathHasMergeMarkers(filePath),
        };
      }),
    );

    for (const {filePath, hasMarkers} of mergeMarkers) {
      if (hasMarkers) {
        const choice = this.props.confirm({
          message: 'File contains merge markers: ',
          detailedMessage: `Do you still want to stage this file?\n${filePath}`,
          buttons: ['Stage', 'Cancel'],
        });
        if (choice !== 0) { pathsToStage.delete(filePath); }
      }
    }

    return this.props.repository.stageFiles(Array.from(pathsToStage));
  }

  @autobind
  unstageFiles(filePaths) {
    return this.props.repository.unstageFiles(filePaths);
  }

  @autobind
  async prepareToCommit() {
    return !await this.props.ensureGitTab();
  }

  @autobind
  commit(message, options) {
    return this.props.repository.commit(message, options);
  }

  @autobind
  updateSelectedCoAuthors(selectedCoAuthors, newAuthor) {
    if (newAuthor) {
      this.userStore.addUsers({[newAuthor.email]: newAuthor.name});
      selectedCoAuthors = selectedCoAuthors.concat([newAuthor]);
    }
    this.setState({selectedCoAuthors});
  }

  @autobind
  async undoLastCommit() {
    const repo = this.props.repository;
    const lastCommit = await repo.getLastCommit();
    if (lastCommit.isUnbornRef()) { return null; }
    repo.setCommitMessage(lastCommit.getFullMessage());
    this.updateSelectedCoAuthors(lastCommit.getCoAuthors());
    return repo.undoLastCommit();
  }

  @autobind
  async abortMerge() {
    const choice = this.props.confirm({
      message: 'Abort merge',
      detailedMessage: 'Are you sure?',
      buttons: ['Abort', 'Cancel'],
    });
    if (choice !== 0) { return; }

    try {
      await this.props.repository.abortMerge();
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
  }

  @autobind
  async resolveAsOurs(paths) {
    if (this.lastRepoData.fetchInProgress) {
      return;
    }

    const side = this.lastRepoData.isRebasing ? 'theirs' : 'ours';
    await this.props.repository.checkoutSide(side, paths);
    this.refreshResolutionProgress(false, true);
  }

  @autobind
  async resolveAsTheirs(paths) {
    if (this.lastRepoData.fetchInProgress) {
      return;
    }

    const side = this.lastRepoData.isRebasing ? 'ours' : 'theirs';
    await this.props.repository.checkoutSide(side, paths);
    this.refreshResolutionProgress(false, true);
  }

  @autobind
  checkout(branchName, options) {
    return this.props.repository.checkout(branchName, options);
  }

  @autobind
  rememberLastFocus(event) {
    this.lastFocus = this.refView.rememberFocus(event) || GitTabView.focus.STAGING;
  }

  restoreFocus() {
    this.refView.setFocus(this.lastFocus);
  }

  hasFocus() {
    return this.refView.refRoot.contains(document.activeElement);
  }

  wasActivated(isStillActive) {
    process.nextTick(() => {
      isStillActive() && this.restoreFocus();
    });
  }

  focusAndSelectStagingItem(filePath, stagingStatus) {
    return this.refView.focusAndSelectStagingItem(filePath, stagingStatus);
  }

  @autobind
  quietlySelectItem(filePath, stagingStatus) {
    return this.refView.quietlySelectItem(filePath, stagingStatus);
  }
}
