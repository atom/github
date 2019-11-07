import React from 'react';
import PropTypes from 'prop-types';

import {
  GithubLoginModelPropType, RefHolderPropType, RemoteSetPropType, RemotePropType, BranchSetPropType, BranchPropType,
  OperationStateObserverPropType,
} from '../prop-types';
import LoadingView from './loading-view';
import RemoteSelectorView from './remote-selector-view';
import GithubTabHeaderContainer from '../containers/github-tab-header-container';
import GithubTabHeaderController from '../controllers/github-tab-header-controller';
import RemoteContainer from '../containers/remote-container';
import {nullAuthor} from '../models/author';

export default class GitHubTabView extends React.Component {
  static propTypes = {
    rootHolder: RefHolderPropType.isRequired,

    // Connection
    loginModel: GithubLoginModelPropType.isRequired,

    // Workspace
    workspace: PropTypes.object.isRequired,
    workingDirectory: PropTypes.string,
    getCurrentWorkDirs: PropTypes.func.isRequired,
    changeWorkingDirectory: PropTypes.func.isRequired,

    // Observers
    remoteOperationObserver: OperationStateObserverPropType.isRequired,

    // Remotes
    remotes: RemoteSetPropType.isRequired,
    currentRemote: RemotePropType.isRequired,
    manyRemotesAvailable: PropTypes.bool.isRequired,
    isLoading: PropTypes.bool.isRequired,
    branches: BranchSetPropType.isRequired,
    currentBranch: BranchPropType.isRequired,
    aheadCount: PropTypes.number,
    pushInProgress: PropTypes.bool.isRequired,

    // Event Handelrs
    handleWorkDirSelect: PropTypes.func,
    handlePushBranch: PropTypes.func.isRequired,
    handleRemoteSelect: PropTypes.func.isRequired,
    onDidChangeWorkDirs: PropTypes.func.isRequired,
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

    if (this.props.currentRemote.isPresent()) {
      // Single, chosen or unambiguous remote
      return (
        <RemoteContainer
          // Connection
          loginModel={this.props.loginModel}
          endpoint={this.props.currentRemote.getEndpoint()}

          // Workspace
          workspace={this.props.workspace}
          workingDirectory={this.props.workingDirectory}

          // Remote
          remote={this.props.currentRemote}
          remotes={this.props.remotes}
          branches={this.props.branches}
          aheadCount={this.props.aheadCount}
          pushInProgress={this.props.pushInProgress}

          // Observers
          remoteOperationObserver={this.props.remoteOperationObserver}

          // Event Handlers
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

  renderHeader() {
    if (this.props.currentRemote.isPresent()) {
      return (
        <GithubTabHeaderContainer
          // Connection
          loginModel={this.props.loginModel}
          endpoint={this.props.currentRemote.getEndpoint()}

          // Workspace
          currentWorkDir={this.props.workingDirectory}
          getCurrentWorkDirs={this.props.getCurrentWorkDirs}

          // Event Handlers
          handleWorkDirSelect={e => this.props.changeWorkingDirectory(e.target.value)}
          onDidChangeWorkDirs={this.props.onDidChangeWorkDirs}
        />
      );
    }
    return (
      <GithubTabHeaderController
        user={nullAuthor}

        // Workspace
        currentWorkDir={this.props.workingDirectory}
        getCurrentWorkDirs={this.props.getCurrentWorkDirs}

        // Event Handlers
        handleWorkDirSelect={this.props.handleWorkDirSelect}
        onDidChangeWorkDirs={this.props.onDidChangeWorkDirs}
      />
    );
  }
}
