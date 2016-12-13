/** @babel */
/** @jsx etch.dom */
/* eslint react/no-unknown-property: "off" */

import etch from 'etch';
import {Disposable, CompositeDisposable} from 'atom';

import StagingView from './staging-view';
import CommitView from './commit-view';

export default class GitPanelView {
  constructor(props) {
    this.props = props;
    this.onCancel = this.onCancel.bind(this);
    this.onFocusIn = this.onFocusIn.bind(this);
    this.onAdvanceFocus = this.onAdvanceFocus.bind(this);
    this.onRetreatFocus = this.onRetreatFocus.bind(this);

    etch.initialize(this);

    this.element.addEventListener('focusin', this.onFocusIn);

    this.subscriptions = new CompositeDisposable(
      this.props.commandRegistry.add(this.element, {
        'core:cancel': this.onCancel,
        'git:advance-focus': this.onAdvanceFocus,
        'git:retreat-focus': this.onRetreatFocus,
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
            stagedChanges={this.props.stagedChanges}
            unstagedChanges={this.props.unstagedChanges}
            mergeConflicts={this.props.mergeConflicts}
            didSelectFilePath={this.props.didSelectFilePath}
            didSelectMergeConflictFile={this.props.didSelectMergeConflictFile}
            focusFilePatchView={this.props.focusFilePatchView}
            stageFiles={this.props.stageFiles}
            unstageFiles={this.props.unstageFiles}
            lastCommit={this.props.lastCommit}
            isAmending={this.props.isAmending}
          />
          <CommitView
            ref="commitView"
            workspace={this.props.workspace}
            stagedChangesExist={this.props.stagedChanges.length > 0}
            mergeConflictsExist={this.props.mergeConflicts.length > 0}
            commit={this.props.commit}
            setAmending={this.props.setAmending}
            disableCommitButton={this}
            abortMerge={this.props.abortMerge}
            branchName={this.props.branchName}
            commandRegistry={this.props.commandRegistry}
            notificationManager={this.props.notificationManager}
            maximumCharacterLimit={72}
            message={this.props.mergeMessage}
            isMerging={this.props.isMerging}
            isAmending={this.props.isAmending}
            lastCommit={this.props.lastCommit}
            repository={this.props.repository}
            viewState={this.props.viewState}
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

  onAdvanceFocus() {
    if (!this.refs.stagingView) {
      return;
    }

    if (!this.refs.stagingView.activateNextList()) {
      this.refs.commitView.focus();
    }
  }

  onRetreatFocus() {
    const {stagingView, commitView} = this.refs;

    if (!stagingView || !commitView) {
      return;
    }

    if (commitView.isFocused()) {
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

  isFocused() {
    return this.element === document.activeElement || this.element.contains(document.activeElement);
  }
}
