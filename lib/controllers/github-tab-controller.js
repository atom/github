import React from 'react';
import PropTypes from 'prop-types';
import yubikiri from 'yubikiri';

import RemoteSelectorView from '../views/remote-selector-view';
import RemoteContainer from '../containers/remote-container';
import GithubLoginModel from '../models/github-login-model';
import ObserveModel from '../views/observe-model';
import {autobind} from '../helpers';

export default class GithubTabController extends React.Component {
  static propTypes = {
    workspace: PropTypes.object.isRequired,
    repository: PropTypes.object,
    loginModel: PropTypes.instanceOf(GithubLoginModel),
  }

  constructor(props) {
    super(props);
    autobind(this, 'handleRemoteSelect');
  }

  fetchModelData(repo) {
    return yubikiri({
      remotes: repo.getRemotes().then(remotes => remotes.filter(remote => remote.isGithubRepo())),
      branches: repo.getBranches(),
      selectedRemoteName: repo.getConfig('atomGithub.currentRemote'),
      selectedPrUrl: async query => {
        const branches = await query.branches;
        const currentBranch = branches.getHeadBranch();
        if (!currentBranch.isPresent()) { return null; }
        return repo.getConfig(`branch.${currentBranch.getName()}.atomPrUrl`);
      },
      aheadCount: async query => {
        const branches = await query.branches;
        const currentBranch = branches.getHeadBranch();
        return repo.getAheadCount(currentBranch.getName());
      },
    });
  }

  serialize() {
    return {
      deserializer: 'GithubDockItem',
      uri: this.getURI(),
    };
  }

  render() {
    return (
      <ObserveModel model={this.props.repository} fetchData={this.fetchModelData}>
        {data => { return data ? this.renderWithData(data) : null; } }
      </ObserveModel>
    );
  }

  renderWithData(data) {
    const {
      remotes, branches, selectedRemoteName, selectedPrUrl, aheadCount,
    } = data;
    if (!this.props.repository.isPresent() || !remotes) {
      return null;
    }

    const currentBranch = branches.getHeadBranch();

    let remote = remotes.find(r => r.getName() === selectedRemoteName);
    let manyRemotesAvailable = false;
    if (!remote && remotes.length === 1) {
      remote = remotes[0];
    } else if (!remote && remotes.length > 1) {
      manyRemotesAvailable = true;
    }

    const pushInProgress = this.props.repository.getOperationStates().isPushInProgress();

    return (
      <div ref={c => { this.root = c; }} className="github-GithubTabController">
        <div className="github-GithubTabController-content">
          {/* only supporting GH.com for now, hardcoded values */}
          {remote &&
            <RemoteContainer
              host="https://api.github.com"
              loginModel={this.props.loginModel}
              workspace={this.props.workspace}
              onPushBranch={() => this.handlePushBranch(currentBranch, remote)}
              remote={remote}
              branches={branches}
              aheadCount={aheadCount}
              pushInProgress={pushInProgress}
            />
          }
          {!remote && manyRemotesAvailable &&
            <RemoteSelectorView
              remotes={remotes}
              currentBranch={currentBranch}
              selectRemote={this.handleRemoteSelect}
            />
          }
          {!remote && !manyRemotesAvailable && this.renderNoRemotes()}
        </div>
      </div>
    );
  }

  handleSelectPrByUrl(prUrl, currentBranch) {
    return this.props.repository.setConfig(`branch.${currentBranch.getName()}.atomPrUrl`, prUrl);
  }

  handleUnpinPr(currentBranch) {
    return this.props.repository.unsetConfig(`branch.${currentBranch.getName()}.atomPrUrl`);
  }

  handlePushBranch(currentBranch, targetRemote) {
    return this.props.repository.push(currentBranch.getName(), {
      remote: targetRemote,
      setUpstream: true,
    });
  }

  getTitle() {
    return 'GitHub (preview)';
  }

  getIconName() {
    return 'octoface';
  }

  getDefaultLocation() {
    return 'right';
  }

  getPreferredWidth() {
    return 400;
  }

  getURI() {
    return 'atom-github://dock-item/github';
  }

  getWorkingDirectory() {
    return this.props.repository.getWorkingDirectoryPath();
  }

  renderNoRemotes() {
    return (
      <div className="github-GithubTabController-no-remotes">
        This repository does not have any remotes hosted at GitHub.com.
      </div>
    );
  }

  handleRemoteSelect(e, remote) {
    e.preventDefault();
    this.props.repository.setConfig('atomGithub.currentRemote', remote.getName());
  }

  hasFocus() {
    return this.root && this.root.contains(document.activeElement);
  }

  restoreFocus() {
    // No-op
  }
}
