import React from 'react';
import PropTypes from 'prop-types';

import {
  GithubLoginModelPropType, RefHolderPropType, RemoteSetPropType, RemotePropType, BranchSetPropType, BranchPropType,
  OperationStateObserverPropType,
} from '../prop-types';
import LoadingView from './loading-view';
import RemoteSelectorView from './remote-selector-view';
import TabHeaderView from './tab-header-view';
import GitHubBlankNoLocal from './github-blank-nolocal';
import GitHubBlankUninitialized from './github-blank-uninitialized';
import GitHubBlankNoRemote from './github-blank-noremote';
import RemoteContainer from '../containers/remote-container';

export default class GitHubTabView extends React.Component {
  static propTypes = {
    workspace: PropTypes.object.isRequired,
    remoteOperationObserver: OperationStateObserverPropType.isRequired,
    loginModel: GithubLoginModelPropType.isRequired,
    rootHolder: RefHolderPropType.isRequired,

    workingDirectory: PropTypes.string,
    repository: PropTypes.object.isRequired,
    branches: BranchSetPropType.isRequired,
    currentBranch: BranchPropType.isRequired,
    remotes: RemoteSetPropType.isRequired,
    currentRemote: RemotePropType.isRequired,
    manyRemotesAvailable: PropTypes.bool.isRequired,
    aheadCount: PropTypes.number,
    pushInProgress: PropTypes.bool.isRequired,
    isLoading: PropTypes.bool.isRequired,

    handlePushBranch: PropTypes.func.isRequired,
    handleRemoteSelect: PropTypes.func.isRequired,
    changeWorkingDirectory: PropTypes.func.isRequired,
    onDidChangeWorkDirs: PropTypes.func.isRequired,
    getCurrentWorkDirs: PropTypes.func.isRequired,
    openCreateDialog: PropTypes.func.isRequired,
    openBoundPublishDialog: PropTypes.func.isRequired,
    openCloneDialog: PropTypes.func.isRequired,
    openGitTab: PropTypes.func.isRequired,
  }

  render() {
    return (
      <div className="github-GitHub" ref={this.props.rootHolder.setter}>
        {this.renderHeader()}
        <div className="github-GitHub-content">
          {this.renderRemote()}
        </div>
      </div>
    );
  }

  renderRemote() {
    if (this.props.isLoading) {
      return <LoadingView />;
    }

    if (this.props.repository.isAbsent() || this.props.repository.isAbsentGuess()) {
      return (
        <GitHubBlankNoLocal
          openCreateDialog={this.props.openCreateDialog}
          openCloneDialog={this.props.openCloneDialog}
        />
      );
    }

    if (this.props.repository.isEmpty()) {
      return (
        <GitHubBlankUninitialized
          openPublishDialog={this.props.openBoundPublishDialog}
          openGitTab={this.props.openGitTab}
        />
      );
    }

    if (this.props.currentRemote.isPresent()) {
      // Single, chosen or unambiguous remote
      return (
        <RemoteContainer
          loginModel={this.props.loginModel}
          endpoint={this.props.currentRemote.getEndpoint()}

          remoteOperationObserver={this.props.remoteOperationObserver}
          pushInProgress={this.props.pushInProgress}
          workingDirectory={this.props.workingDirectory}
          workspace={this.props.workspace}
          remote={this.props.currentRemote}
          remotes={this.props.remotes}
          branches={this.props.branches}
          aheadCount={this.props.aheadCount}

          onPushBranch={() => this.props.handlePushBranch(this.props.currentBranch, this.props.currentRemote)}
        />
      );
    }

    if (this.props.manyRemotesAvailable) {
      // No chosen remote, multiple remotes hosted on GitHub instances
      return (
        <RemoteSelectorView
          remotes={this.props.remotes}
          currentBranch={this.props.currentBranch}
          selectRemote={this.props.handleRemoteSelect}
        />
      );
    }

    return (
      <GitHubBlankNoRemote openPublishDialog={this.props.openBoundPublishDialog} />
    );
  }

  renderHeader() {
    return (
      <TabHeaderView
        handleWorkDirSelect={e => this.props.changeWorkingDirectory(e.target.value)}
        currentWorkDir={this.props.workingDirectory}
        getCurrentWorkDirs={this.props.getCurrentWorkDirs}
        onDidChangeWorkDirs={this.props.onDidChangeWorkDirs}
      />
    );
  }
}
