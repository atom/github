import React from 'react';
import PropTypes from 'prop-types';

import {
  GithubLoginModelPropType, RefHolderPropType, RemoteSetPropType, RemotePropType, BranchSetPropType, BranchPropType,
  OperationStateObserverPropType,
} from '../prop-types';
import LoadingView from './loading-view';
import RemoteSelectorView from './remote-selector-view';
import RemoteContainer from '../containers/remote-container';
import GithubHeaderContainer from '../containers/github-header-container';


export default class GitHubTabView extends React.Component {
  static propTypes = {
    workspace: PropTypes.object.isRequired,
    remoteOperationObserver: OperationStateObserverPropType.isRequired,
    loginModel: GithubLoginModelPropType.isRequired,
    rootHolder: RefHolderPropType.isRequired,

    workingDirectory: PropTypes.string,
    branches: BranchSetPropType.isRequired,
    currentBranch: BranchPropType.isRequired,
    remotes: RemoteSetPropType.isRequired,
    currentRemote: RemotePropType.isRequired,
    isSelectingRemote: PropTypes.bool.isRequired,
    aheadCount: PropTypes.number,
    pushInProgress: PropTypes.bool.isRequired,
    isLoading: PropTypes.bool.isRequired,

    handlePushBranch: PropTypes.func.isRequired,
    handleRemoteSelect: PropTypes.func.isRequired,
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

  renderHeader() {
    if (this.props.isLoading || !this.props.currentRemote.isPresent()) { return null; }

    const {currentRemote, remotes, handleRemoteSelect} = this.props;
    const currentRemoteName = currentRemote && currentRemote.name ? currentRemote.name : ' ';
    return (
      <GithubHeaderContainer
        loginModel={this.props.loginModel}
        endpoint={this.props.currentRemote.getEndpoint()}
        currentRemoteName={currentRemoteName}
        remotes={remotes}

        handleRemoteSelect={e => handleRemoteSelect(e, remotes.withName(e.target.value))}
      />
    );
  }

  renderRemote() {
    if (this.props.isLoading) {
      return <LoadingView />;
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

    if (this.props.isSelectingRemote) {
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
        <div className="github-GitHub-LargeIcon icon icon-mark-github" />
        <h1>No Remotes</h1>
        <div className="initialize-repo-description">
          <span>This repository does not have any remotes hosted at GitHub.com.</span>
        </div>
      </div>
    );
  }
}
