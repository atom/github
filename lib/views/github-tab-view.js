import React from 'react';
import PropTypes from 'prop-types';

import {
  TokenPropType, EndpointPropType, RefHolderPropType,
  RemoteSetPropType, RemotePropType, BranchSetPropType, BranchPropType,
  RefresherPropType,
} from '../prop-types';
import LoadingView from './loading-view';
import QueryErrorView from '../views/query-error-view';
import GithubLoginView from '../views/github-login-view';
import RemoteSelectorView from './remote-selector-view';
import GithubTabHeaderContainer from '../containers/github-tab-header-container';
import GitHubBlankNoLocal from './github-blank-nolocal';
import GitHubBlankUninitialized from './github-blank-uninitialized';
import GitHubBlankNoRemote from './github-blank-noremote';
import RemoteContainer from '../containers/remote-container';
import {UNAUTHENTICATED, INSUFFICIENT} from '../shared/keytar-strategy';

export default class GitHubTabView extends React.Component {
  static propTypes = {
    refresher: RefresherPropType.isRequired,
    rootHolder: RefHolderPropType.isRequired,

    // Connection
    endpoint: EndpointPropType.isRequired,
    token: TokenPropType,

    // Workspace
    workspace: PropTypes.object.isRequired,
    workingDirectory: PropTypes.string,
    getCurrentWorkDirs: PropTypes.func.isRequired,
    changeWorkingDirectory: PropTypes.func.isRequired,
    contextLocked: PropTypes.bool.isRequired,
    setContextLock: PropTypes.func.isRequired,
    repository: PropTypes.object.isRequired,

    // Remotes
    remotes: RemoteSetPropType.isRequired,
    currentRemote: RemotePropType.isRequired,
    manyRemotesAvailable: PropTypes.bool.isRequired,
    isLoading: PropTypes.bool.isRequired,
    branches: BranchSetPropType.isRequired,
    currentBranch: BranchPropType.isRequired,
    aheadCount: PropTypes.number,
    pushInProgress: PropTypes.bool.isRequired,

    // Event Handlers
    handleLogin: PropTypes.func.isRequired,
    handleLogout: PropTypes.func.isRequired,
    handleTokenRetry: PropTypes.func.isRequired,
    handleWorkDirSelect: PropTypes.func,
    handlePushBranch: PropTypes.func.isRequired,
    handleRemoteSelect: PropTypes.func.isRequired,
    onDidChangeWorkDirs: PropTypes.func.isRequired,
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
    if (this.props.token === null) {
      return <LoadingView />;
    }

    if (this.props.token === UNAUTHENTICATED) {
      return <GithubLoginView onLogin={this.props.handleLogin} />;
    }

    if (this.props.token === INSUFFICIENT) {
      return (
        <GithubLoginView onLogin={this.props.handleLogin}>
          <p>
            Your token no longer has sufficient authorizations. Please re-authenticate and generate a new one.
          </p>
        </GithubLoginView>
      );
    }

    if (this.props.token instanceof Error) {
      return (
        <QueryErrorView
          error={this.props.token}
          retry={this.props.handleTokenRetry}
          login={this.props.handleLogin}
          logout={this.props.handleLogout}
        />
      );
    }

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
          openBoundPublishDialog={this.props.openBoundPublishDialog}
          openGitTab={this.props.openGitTab}
        />
      );
    }

    if (this.props.currentRemote.isPresent()) {
      // Single, chosen or unambiguous remote
      return (
        <RemoteContainer
          // Connection
          endpoint={this.props.currentRemote.getEndpoint()}
          token={this.props.token}

          // Repository attributes
          refresher={this.props.refresher}
          pushInProgress={this.props.pushInProgress}
          workingDirectory={this.props.workingDirectory}
          workspace={this.props.workspace}
          remote={this.props.currentRemote}
          remotes={this.props.remotes}
          branches={this.props.branches}
          aheadCount={this.props.aheadCount}

          // Action methods
          handleLogin={this.props.handleLogin}
          handleLogout={this.props.handleLogout}
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
      <GitHubBlankNoRemote openBoundPublishDialog={this.props.openBoundPublishDialog} />
    );
  }

  renderHeader() {
    return (
      <GithubTabHeaderContainer
        // Connection
        endpoint={this.props.endpoint}
        token={this.props.token}

        // Workspace
        currentWorkDir={this.props.workingDirectory}
        contextLocked={this.props.contextLocked}
        changeWorkingDirectory={this.props.changeWorkingDirectory}
        setContextLock={this.props.setContextLock}
        getCurrentWorkDirs={this.props.getCurrentWorkDirs}

        // Event Handlers
        onDidChangeWorkDirs={this.props.onDidChangeWorkDirs}
      />
    );
  }
}
