import React from 'react';
import PropTypes from 'prop-types';

import {
  GithubLoginModelPropType, RefHolderPropType, RemoteSetPropType, BranchSetPropType, OperationStateObserverPropType,
} from '../prop-types';
import GitHubTabView from '../views/github-tab-view';

export default class GitHubTabController extends React.Component {
  static propTypes = {
    workspace: PropTypes.object.isRequired,
    repository: PropTypes.object.isRequired,
    remoteOperationObserver: OperationStateObserverPropType.isRequired,
    loginModel: GithubLoginModelPropType.isRequired,
    rootHolder: RefHolderPropType.isRequired,

    workingDirectory: PropTypes.string,
    allRemotes: RemoteSetPropType.isRequired,
    branches: BranchSetPropType.isRequired,
    selectedRemoteName: PropTypes.string,
    aheadCount: PropTypes.number,
    pushInProgress: PropTypes.bool.isRequired,
    isLoading: PropTypes.bool.isRequired,
  }

  render() {
    const gitHubRemotes = this.props.allRemotes.filter(remote => remote.isGithubRepo());
    const currentBranch = this.props.branches.getHeadBranch();

    let currentRemote = gitHubRemotes.withName(this.props.selectedRemoteName);
    let manyRemotesAvailable = false;
    if (!currentRemote.isPresent() && gitHubRemotes.size() === 1) {
      currentRemote = Array.from(gitHubRemotes)[0];
    } else if (!currentRemote.isPresent() && gitHubRemotes.size() > 1) {
      manyRemotesAvailable = true;
    }

    return (
      <GitHubTabView
        workspace={this.props.workspace}
        remoteOperationObserver={this.props.remoteOperationObserver}
        loginModel={this.props.loginModel}
        rootHolder={this.props.rootHolder}

        workingDirectory={this.props.workingDirectory}
        branches={this.props.branches}
        currentBranch={currentBranch}
        remotes={gitHubRemotes}
        currentRemote={currentRemote}
        manyRemotesAvailable={manyRemotesAvailable}
        aheadCount={this.props.aheadCount}
        pushInProgress={this.props.pushInProgress}
        isLoading={this.props.isLoading}

        handlePushBranch={this.handlePushBranch}
        handleRemoteSelect={this.handleRemoteSelect}
      />
    );
  }

  handlePushBranch = (currentBranch, targetRemote) => {
    return this.props.repository.push(currentBranch.getName(), {
      remote: targetRemote,
      setUpstream: true,
    });
  }

  handleRemoteSelect = (e, remote) => {
    e.preventDefault();
    return this.props.repository.setConfig('atomGithub.currentRemote', remote.getName());
  }
}
