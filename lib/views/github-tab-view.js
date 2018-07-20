import React from 'react';
import PropTypes from 'prop-types';

import {
  GithubLoginModelPropType, RefHolderPropType, RemoteSetPropType, RemotePropType, BranchSetPropType, BranchPropType,
  OperationStateObserverPropType,
} from '../prop-types';
import LoadingView from './loading-view';
import RemoteSelectorView from './remote-selector-view';
import RemoteContainer from '../containers/remote-container';

export default class GitHubTabView extends React.Component {
  static propTypes = {
    workspace: PropTypes.object.isRequired,
    remoteOperationObserver: OperationStateObserverPropType.isRequired,
    loginModel: GithubLoginModelPropType.isRequired,
    rootHolder: RefHolderPropType.isRequired,

    workingDirectory: PropTypes.string.isRequired,
    branches: BranchSetPropType.isRequired,
    currentBranch: BranchPropType.isRequired,
    remotes: RemoteSetPropType.isRequired,
    currentRemote: RemotePropType.isRequired,
    manyRemotesAvailable: PropTypes.bool.isRequired,
    aheadCount: PropTypes.number.isRequired,
    pushInProgress: PropTypes.bool.isRequired,
    isLoading: PropTypes.bool.isRequired,

    handlePushBranch: PropTypes.func.isRequired,
    handleRemoteSelect: PropTypes.func.isRequired,
  }

  render() {
    return (
      <div className="github-GitHub" ref={this.props.rootHolder.setter}>
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

    if (this.props.currentRemote.isPresent()) {
      // Single, chosen or unambiguous remote
      // only supporting GH.com for now, hardcoded values
      return (
        <RemoteContainer
          host="https://api.github.com"
          loginModel={this.props.loginModel}
          remoteOperationObserver={this.props.remoteOperationObserver}
          workingDirectory={this.props.workingDirectory}
          workspace={this.props.workspace}
          onPushBranch={() => this.props.handlePushBranch(this.props.currentBranch, this.props.currentRemote)}
          remote={this.props.currentRemote}
          remotes={this.props.remotes}
          branches={this.props.branches}
          aheadCount={this.props.aheadCount}
          pushInProgress={this.props.pushInProgress}
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

    // No remotes available
    // TODO: display a view that lets you create a repository on GitHub
    return (
      <div className="github-GitHub-noRemotes">
        This repository does not have any remotes hosted at GitHub.com.
      </div>
    );
  }
}
