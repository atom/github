/** @jsx etch.dom */
/* eslint react/no-unknown-property: "off" */

import etch from 'etch';
import {autobind} from 'core-decorators';
import cx from 'classnames';

import StagingView from './staging-view';
import GitLogo from './git-logo';
import CommitViewController from '../controllers/commit-view-controller';

export default class GitTabView {
  static focus = {
    STAGING: Symbol('staging'),
  };

  constructor(props) {
    this.props = props;
    etch.initialize(this);

    this.subscriptions = this.props.commandRegistry.add(this.element, {
      'tool-panel:unfocus': this.blur,
      'core:focus-next': this.advanceFocus,
      'core:focus-previous': this.retreatFocus,
    });
  }

  update(props) {
    this.props = props;
    return etch.update(this);
  }

  render() {
    if (this.props.repository.showGitTabInit()) {
      const inProgress = this.props.repository.showGitTabInitInProgress();
      const message = this.props.repository.hasDirectory() ?
        'Initialize this project directory with a git repository' :
        'Initialize a new project directory with a git repository';

      return (
        <div className="github-Panel is-empty" tabIndex="-1">
          <div ref="noRepoMessage" className="github-Panel no-repository">
            <div className="large-icon">
              <GitLogo />
            </div>
            <div className="initialize-repo-description">{message}</div>
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

  rememberFocus(event) {
    return this.refs.stagingView.rememberFocus(event) || this.refs.commitViewController.rememberFocus(event);
  }

  restoreFocus(focus) {
    return this.refs.stagingView.restoreFocus(focus) ||
      this.refs.commitViewController.restoreFocus(focus);
  }

  @autobind
  blur() {
    this.props.workspace.getActivePane().activate();
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
