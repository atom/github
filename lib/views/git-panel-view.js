/** @babel */
/** @jsx etch.dom */
/* eslint react/no-unknown-property: "off" */

import etch from 'etch';

import StagingView from './staging-view';
import CommitViewController from '../controllers/commit-view-controller';

export default class GitPanelView {
  constructor(props) {
    this.props = props;
    etch.initialize(this);
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
        <div ref="repoInfo" className="github-Panel" tabIndex="-1">
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
          <CommitViewController
            ref="commitViewController"
            stagedChangesExist={this.props.stagedChanges.length > 0}
            mergeConflictsExist={this.props.mergeConflicts.length > 0}
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
    return etch.destroy(this);
  }

  focus() {
    if (this.refs.stagingView) {
      this.refs.stagingView.focus();
    }
  }
}
