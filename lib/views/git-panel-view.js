/** @babel */
/** @jsx etch.dom */
/* eslint react/no-unknown-property: "off" */

import etch from 'etch';
import {Disposable, CompositeDisposable} from 'atom';

import StagingView from './staging-view';
import CommitViewController from '../controllers/commit-view-controller';

export default class GitPanelView {
  constructor(props) {
    this.props = props;
    this.onCancel = this.onCancel.bind(this);
    this.onFocusIn = this.onFocusIn.bind(this);
    this.onFocusNext = this.onFocusNext.bind(this);
    this.onFocusPrevious = this.onFocusPrevious.bind(this);
    this.onAdvanceFromStagingView = this.onAdvanceFromStagingView.bind(this);
    this.onRetreatFromCommitView = this.onRetreatFromCommitView.bind(this);

    etch.initialize(this);

    this.element.addEventListener('focusin', this.onFocusIn);

    this.subscriptions = new CompositeDisposable(
      this.props.commandRegistry.add(this.element, {
        'tool-panel:unfocus': this.onCancel,
        'core:focus-next': this.onFocusNext,
        'core:focus-previous': this.onFocusPrevious,
      }),
      new Disposable(() => this.element.removeEventListener('focusin', this.onFocusIn)),
    );
  }

  update(props) {
    this.props = props;
    return etch.update(this);
  }

  render() {
    if (!this.props.repository) {
      return (
        <div className="github-Panel" tabIndex="-1">
          <div ref="noRepoMessage" className="github-Panel no-repository">No repository for active pane item</div>
        </div>
      );
    } else if (this.props.fetchInProgress) {
      return (
        <div className="github-Panel" tabIndex="-1">
          <div ref="repoLoadingMessage" className="github-Panel is-loading">Fetching repository data</div>
        </div>
      );
    } else {
      return (
        <div className="github-Panel" tabIndex="-1">
          <StagingView
            ref="stagingView"
            commandRegistry={this.props.commandRegistry}
            stagedChanges={this.props.stagedChanges}
            unstagedChanges={this.props.unstagedChanges}
            mergeConflicts={this.props.mergeConflicts}
            didSelectFilePath={this.props.didSelectFilePath}
            didSelectMergeConflictFile={this.props.didSelectMergeConflictFile}
            didSelectPastEnd={this.onAdvanceFromStagingView}
            focusFilePatchView={this.props.focusFilePatchView}
            attemptFileStageOperation={this.props.attemptFileStageOperation}
            lastCommit={this.props.lastCommit}
            isAmending={this.props.isAmending}
          />
          <CommitViewController
            ref="commitViewController"
            stagedChangesExist={this.props.stagedChanges.length > 0}
            mergeConflictsExist={this.props.mergeConflicts.length > 0}
            didMoveUpOnFirstLine={this.onRetreatFromCommitView}
            commit={this.props.commit}
            amending={this.props.amending}
            setAmending={this.props.setAmending}
            abortMerge={this.props.abortMerge}
            branchName={this.props.branchName}
            commandRegistry={this.props.commandRegistry}
            mergeMessage={this.props.mergeMessage}
            isMerging={this.props.isMerging}
            isAmending={this.props.isAmending}
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

  onCancel() {
    this.props.workspace.getActivePane().activate();
  }

  onFocusIn(event) {
    this.lastFocus = event.target;
  }

  onFocusNext() {
    if (!this.refs.stagingView.activateNextList()) {
      this.refs.commitViewController.focus();
    }
  }

  onFocusPrevious() {
    const {stagingView, commitViewController} = this.refs;

    if (commitViewController.isFocused()) {
      if (stagingView.activateLastList()) {
        stagingView.focus();
      }
    } else {
      stagingView.activatePreviousList();
    }
  }

  onAdvanceFromStagingView() {
    this.refs.commitViewController.focus();
  }

  async onRetreatFromCommitView() {
    this.refs.stagingView.activateLastList();
    await this.refs.stagingView.selectLast();
    this.refs.stagingView.focus();
  }

  focus() {
    // Default focus to the staging view. Fall back to the panel root.
    if (!this.lastFocus) {
      this.lastFocus = this.refs.stagingView || this.element;
    }

    this.lastFocus.focus();
  }

  focusOnStagingItem(filePath, stagingStatus) {
    this.refs.stagingView.quietlySelectItem(filePath, stagingStatus);
    this.refs.stagingView.focus();
  }

  isFocused() {
    return this.element === document.activeElement || this.element.contains(document.activeElement);
  }
}
