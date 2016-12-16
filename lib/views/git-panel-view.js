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
    this.blur = this.blur.bind(this);
    this.rememberLastFocus = this.rememberLastFocus.bind(this);
    this.advanceFocus = this.advanceFocus.bind(this);
    this.retreatFocus = this.retreatFocus.bind(this);
    this.focusCommitView = this.focusCommitView.bind(this);
    this.focusStagingView = this.focusStagingView.bind(this);

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
            didSelectPastEnd={this.focusCommitView}
            focusFilePatchView={this.props.focusFilePatchView}
            attemptFileStageOperation={this.props.attemptFileStageOperation}
            lastCommit={this.props.lastCommit}
            isAmending={this.props.isAmending}
          />
          <CommitViewController
            ref="commitViewController"
            stagedChangesExist={this.props.stagedChanges.length > 0}
            mergeConflictsExist={this.props.mergeConflicts.length > 0}
            didMoveUpOnFirstLine={this.focusStagingView}
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

  blur() {
    this.props.workspace.getActivePane().activate();
  }

  rememberLastFocus(event) {
    this.lastFocus = event.target;
  }

  advanceFocus() {
    if (!this.refs.stagingView.activateNextList()) {
      this.refs.commitViewController.focus();
    }
  }

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

  focusCommitView() {
    this.refs.commitViewController.focus();
  }

  async focusStagingView() {
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
