import React from 'react';
import PropTypes from 'prop-types';
import {autobind} from 'core-decorators';
import yubikiri from 'yubikiri';

import RemotePrController from './remote-pr-controller';
import Repository from '../models/repository';
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
            <li key={remote.name}>
              <a href="#" onClick={e => selectRemote(e, remote)}>
                {remote.name} ({remote.info.owner}/{remote.info.name})
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
  }

  constructor(props, context) {
    super(props, context);
    this.loginModel = GithubLoginModel.get();
  }

  fetchModelData(repo) {
    return yubikiri({
      remotes: repo.getRemotes().then(remotes => {
        return remotes.map(({name, url}) => ({name, url, info: Repository.githubInfoFromRemote(url)}))
          .filter(remote => remote.info.githubRepo);
      }),
      currentBranch: repo.getCurrentBranch(),
      selectedRemote: repo.getConfig('atomGithub.currentRemote'),
    });
  }

  serialize() {
    return {
      deserializer: 'GithubTabControllerStub',
    };
  }

  render() {
    return (
      <ObserveModel model={this.props.repository} fetchData={this.fetchModelData}>
        {data => { return data ? this.renderWithData(data) : null; } }
      </ObserveModel>
    );
  }

  renderWithData({remotes, currentBranch, selectedRemote}) {
    if (!this.props.repository || !remotes) {
      return null;
    }

    if (!currentBranch || currentBranch.isDetached) {
      return null;
    }

    let remote = remotes.find(r => r.name === selectedRemote);
    let manyRemotesAvailable = false;
    if (!remote && remotes.length === 1) {
      remote = remotes[0];
    } else if (!remote && remotes.length > 1) {
      manyRemotesAvailable = true;
    }

    return (
      <div className="github-GithubTabController">
        <div className="github-GithubTabController-content">
          {/* only supporting GH.com for now, hardcoded values */}
          {remote &&
            <RemotePrController
              host="https://api.github.com"
              loginModel={this.loginModel}
              remote={remote}
              currentBranchName={currentBranch.name}
            />
          }
          {!remote && manyRemotesAvailable &&
            <RemoteSelector
              remotes={remotes}
              currentBranchName={currentBranch.name}
              selectRemote={this.handleRemoteSelect}
            />
          }
          {!remote && !manyRemotesAvailable && this.renderNoRemotes()}
        </div>
      </div>
    );
  }

  getTitle() {
    return 'GitHub (alpha)';
  }

  getIconName() {
    return 'octoface';
  }

  getDefaultLocation() {
    return 'right';
  }

  getURI() {
    return 'atom-github://stub-uri/github-tab-controller';
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
    this.props.repository.setConfig('atomGithub.currentRemote', remote.name);
  }
}
