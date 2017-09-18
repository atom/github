import React from 'react';
import PropTypes from 'prop-types';
import {autobind} from 'core-decorators';
import yubikiri from 'yubikiri';

import RemotePrController from './remote-pr-controller';
import GithubLoginModel from '../models/github-login-model';
import ObserveModel from '../views/observe-model';
import {RemotePropType} from '../prop-types';

class RemoteSelector extends React.Component {
  static propTypes = {
    remotes: PropTypes.arrayOf(RemotePropType).isRequired,
    currentBranchName: PropTypes.string.isRequired,
    selectRemote: PropTypes.func.isRequired,
  }

  render() {
    const {remotes, currentBranchName, selectRemote} = this.props;
    return (
      <div className="github-RemoteSelector">
        <p>
          This repository has multiple remotes hosted at GitHub.com.
          Select a remote to see pull requests associated
          with the <strong>{currentBranchName}</strong> branch.
        </p>
        <ul>
          {remotes.map(remote => (
            <li key={remote.getName()}>
              <a href="#" onClick={e => selectRemote(e, remote)}>
                {remote.getName()} ({remote.getOwner()}/{remote.getRepo()})
              </a>
            </li>
          ))}
        </ul>
      </div>
    );
  }
}

export default class GithubTabController extends React.Component {
  static propTypes = {
    repository: PropTypes.object,
    loginModel: PropTypes.instanceOf(GithubLoginModel),
  }

  fetchModelData(repo) {
    return yubikiri({
      remotes: repo.getRemotes().then(remotes => remotes.filter(remote => remote.isGithubRepo())),
      currentBranch: repo.getCurrentBranch(),
      selectedRemoteName: repo.getConfig('atomGithub.currentRemote'),
      selectedPrUrl: async query => {
        const branch = await query.currentBranch;
        if (!branch.isPresent() || branch.isDetached()) { return null; }
        return repo.getConfig(`branch.${branch.getName()}.atomPrUrl`);
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

  renderWithData({remotes, currentBranch, selectedRemoteName, selectedPrUrl}) {
    if (!this.props.repository.isPresent() || !remotes) {
      return null;
    }

    if (!currentBranch.isPresent() || currentBranch.isDetached()) {
      return null;
    }

    let remote = remotes.find(r => r.getName() === selectedRemoteName);
    let manyRemotesAvailable = false;
    if (!remote && remotes.length === 1) {
      remote = remotes[0];
    } else if (!remote && remotes.length > 1) {
      manyRemotesAvailable = true;
    }

    return (
      <div ref={c => { this.root = c; }} className="github-GithubTabController">
        <div className="github-GithubTabController-content">
          {/* only supporting GH.com for now, hardcoded values */}
          {remote &&
            <RemotePrController
              host="https://api.github.com"
              loginModel={this.props.loginModel}
              onSelectPr={prUrl => this.handleSelectPrByUrl(prUrl, currentBranch)}
              selectedPrUrl={selectedPrUrl}
              onUnpinPr={() => this.handleUnpinPr(currentBranch)}
              remote={remote}
              currentBranchName={currentBranch.getName()}
            />
          }
          {!remote && manyRemotesAvailable &&
            <RemoteSelector
              remotes={remotes}
              currentBranchName={currentBranch.getName()}
              selectRemote={this.handleRemoteSelect}
            />
          }
          {!remote && !manyRemotesAvailable && this.renderNoRemotes()}
        </div>
      </div>
    );
  }

  @autobind
  handleSelectPrByUrl(prUrl, currentBranch) {
    return this.props.repository.setConfig(`branch.${currentBranch.getName()}.atomPrUrl`, prUrl);
  }

  @autobind
  handleUnpinPr(currentBranch) {
    return this.props.repository.unsetConfig(`branch.${currentBranch.getName()}.atomPrUrl`);
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

  @autobind
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
