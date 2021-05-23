import React from 'react';
import PropTypes from 'prop-types';

import {
  GithubLoginModelPropType, TokenPropType, RefHolderPropType,
  RemoteSetPropType, RemotePropType, BranchSetPropType, BranchPropType,
  RefresherPropType,
} from '../prop-types';
import GitHubTabView from '../views/github-tab-view';
import {incrementCounter} from '../reporter-proxy';

export default class GitHubTabController extends React.Component {
  static propTypes = {
    workspace: PropTypes.object.isRequired,
    refresher: RefresherPropType.isRequired,
    loginModel: GithubLoginModelPropType.isRequired,
    token: TokenPropType,
    rootHolder: RefHolderPropType.isRequired,

    workingDirectory: PropTypes.string,
    repository: PropTypes.object.isRequired,
    allRemotes: RemoteSetPropType.isRequired,
    githubRemotes: RemoteSetPropType.isRequired,
    currentRemote: RemotePropType.isRequired,
    branches: BranchSetPropType.isRequired,
    currentBranch: BranchPropType.isRequired,
    aheadCount: PropTypes.number.isRequired,
    manyRemotesAvailable: PropTypes.bool.isRequired,
    pushInProgress: PropTypes.bool.isRequired,
    isLoading: PropTypes.bool.isRequired,
    currentWorkDir: PropTypes.string,

    changeWorkingDirectory: PropTypes.func.isRequired,
    setContextLock: PropTypes.func.isRequired,
    contextLocked: PropTypes.bool.isRequired,
    onDidChangeWorkDirs: PropTypes.func.isRequired,
    getCurrentWorkDirs: PropTypes.func.isRequired,
    openCreateDialog: PropTypes.func.isRequired,
    openPublishDialog: PropTypes.func.isRequired,
    openCloneDialog: PropTypes.func.isRequired,
    openGitTab: PropTypes.func.isRequired,
  }

  render() {
    return (
      <GitHubTabView
        // Connection
        endpoint={this.currentEndpoint()}
        token={this.props.token}

        workspace={this.props.workspace}
        refresher={this.props.refresher}
        rootHolder={this.props.rootHolder}

        workingDirectory={this.props.workingDirectory || this.props.currentWorkDir}
        contextLocked={this.props.contextLocked}
        repository={this.props.repository}
        branches={this.props.branches}
        currentBranch={this.props.currentBranch}
        remotes={this.props.githubRemotes}
        currentRemote={this.props.currentRemote}
        manyRemotesAvailable={this.props.manyRemotesAvailable}
        aheadCount={this.props.aheadCount}
        pushInProgress={this.props.pushInProgress}
        isLoading={this.props.isLoading}

        handleLogin={this.handleLogin}
        handleLogout={this.handleLogout}
        handleTokenRetry={this.handleTokenRetry}
        handlePushBranch={this.handlePushBranch}
        handleRemoteSelect={this.handleRemoteSelect}
        changeWorkingDirectory={this.props.changeWorkingDirectory}
        setContextLock={this.props.setContextLock}
        getCurrentWorkDirs={this.props.getCurrentWorkDirs}
        onDidChangeWorkDirs={this.props.onDidChangeWorkDirs}
        openCreateDialog={this.props.openCreateDialog}
        openBoundPublishDialog={this.openBoundPublishDialog}
        openCloneDialog={this.props.openCloneDialog}
        openGitTab={this.props.openGitTab}
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

  openBoundPublishDialog = () => this.props.openPublishDialog(this.props.repository);

  handleLogin = token => {
    incrementCounter('github-login');
    this.props.loginModel.setToken(this.currentEndpoint().getLoginAccount(), token);
  }

  handleLogout = () => {
    incrementCounter('github-logout');
    this.props.loginModel.removeToken(this.currentEndpoint().getLoginAccount());
  }

  handleTokenRetry = () => this.props.loginModel.didUpdate();

  currentEndpoint() {
    return this.props.currentRemote.getEndpointOrDotcom();
  }
}
