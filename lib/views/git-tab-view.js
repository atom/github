/** @jsx etch.dom */
/* eslint react/no-unknown-property: "off" */

import {Disposable, CompositeDisposable} from 'event-kit';

import etch from 'etch';
import {autobind} from 'core-decorators';
import cx from 'classnames';

import StagingView from './staging-view';
import GitLogo from './git-logo';
import CommitViewController from '../controllers/commit-view-controller';

export default class GitTabView {
  constructor(props) {
    this.props = props;
    etch.initialize(this);

    this.element.addEventListener('focusin', this.rememberLastFocus);

    this.subscriptions = new CompositeDisposable(
      this.props.commandRegistry.add(this.element, {
        'tool-panel:unfocus': this.blur,
        'core:focus-next': this.advanceFocus,
        'core:focus-previous': this.retreatFocus,
      }),
      new Disposable(() => this.element.removeEventListener('focusin', this.rememberLastFocus)),
    );
  }

  update(props) {
    this.props = props;
    return etch.update(this);
  }

  render() {
    if (this.props.repository.showGitTabInit()) {
      const inProgress = this.props.repository.showGitTabInitInProgress();

      return (
        <div className="github-Panel is-empty" tabIndex="-1">
          <div ref="noRepoMessage" className="github-Panel no-repository">
            <div className="large-icon">
              <GitLogo />
            </div>
            <div className="initialize-repo-description">Initialize this project directory with a Git repository</div>
            <button onclick={this.initializeRepo} disabled={inProgress} className="btn btn-primary">
              {inProgress ? 'Creating repository...' : 'Create repository'}
            </button>
          </div>
        </div>
      );
    } else {
      const isLoading = this.props.fetchInProgress || this.props.repository.showGitTabLoading();

      return (
        <div className={cx('github-Panel', {'is-loading': isLoading})} tabIndex="-1">
          <StagingView
            ref="stagingView"
            commandRegistry={this.props.commandRegistry}
            stagedChanges={this.props.stagedChanges}
            unstagedChanges={this.props.unstagedChanges}
            mergeConflicts={this.props.mergeConflicts}
            workingDirectoryPath={this.props.workingDirectoryPath}
            resolutionProgress={this.props.resolutionProgress}
            didSelectFilePath={this.props.didSelectFilePath}
            didSelectMergeConflictFile={this.props.didSelectMergeConflictFile}
            didDiveIntoFilePath={this.props.didDiveIntoFilePath}
            didDiveIntoMergeConflictPath={this.props.didDiveIntoMergeConflictPath}
            openFiles={this.props.openFiles}
            discardWorkDirChangesForPaths={this.props.discardWorkDirChangesForPaths}
            focusFilePatchView={this.props.focusFilePatchView}
            attemptFileStageOperation={this.props.attemptFileStageOperation}
            undoLastDiscard={this.props.undoLastDiscard}
            abortMerge={this.props.abortMerge}
            resolveAsOurs={this.props.resolveAsOurs}
            resolveAsTheirs={this.props.resolveAsTheirs}
            lastCommit={this.props.lastCommit}
            isLoading={this.props.isLoading}
            isAmending={this.props.isAmending}
            hasUndoHistory={this.props.hasUndoHistory}
            isMerging={this.props.isMerging}
          />
          <CommitViewController
            ref="commitViewController"
            stagedChangesExist={this.props.stagedChanges.length > 0}
            mergeConflictsExist={this.props.mergeConflicts.length > 0}
            prepareToCommit={this.props.prepareToCommit}
            commit={this.props.commit}
            amending={this.props.amending}
            setAmending={this.props.setAmending}
            abortMerge={this.props.abortMerge}
            branchName={this.props.branchName}
            commandRegistry={this.props.commandRegistry}
            mergeMessage={this.props.mergeMessage}
            isMerging={this.props.isMerging}
            isAmending={this.props.isAmending}
            isLoading={this.props.isLoading}
            lastCommit={this.props.lastCommit}
            repository={this.props.repository}
          />
        </div>
      );
    }
  }

  destroy() {
    this.subscriptions.dispose();
    return etch.destroy(this);
  }

  @autobind
  async initializeRepo(event) {
    event.preventDefault();
    await this.props.initializeRepo();
  }

  @autobind
  blur() {
    this.props.workspace.getActivePane().activate();
  }

  @autobind
  rememberLastFocus(event) {
    this.lastFocus = event.target;
  }

  @autobind
  advanceFocus() {
    if (!this.refs.stagingView.activateNextList()) {
      this.refs.commitViewController.focus();
    }
  }

  @autobind
  retreatFocus() {
    const {stagingView, commitViewController} = this.refs;

    if (commitViewController.isFocused()) {
      if (stagingView.activateLastList()) {
        stagingView.focus();
      }
    } else {
      stagingView.activatePreviousList();
    }
  }

  focus() {
    // Default focus to the staging view. Fall back to the panel root.
    if (!this.lastFocus) {
      this.lastFocus = this.refs.stagingView || this.element;
    }

    this.lastFocus.focus();
  }

  async focusAndSelectStagingItem(filePath, stagingStatus) {
    await this.refs.stagingView.quietlySelectItem(filePath, stagingStatus);
    this.refs.stagingView.focus();
  }

  isFocused() {
    return this.element === document.activeElement || this.element.contains(document.activeElement);
  }

  @autobind
  quitelySelectItem(filePath, stagingStatus) {
    return this.refs.stagingView.quietlySelectItem(filePath, stagingStatus);
  }
}
