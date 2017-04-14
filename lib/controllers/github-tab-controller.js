import React from 'react';
import PropTypes from 'prop-types';
import {autobind} from 'core-decorators';
import yubikiri from 'yubikiri';

import RemotePrController from './remote-pr-controller';
import Repository from '../models/repository';
import GithubLoginModel from '../models/github-login-model';
import ObserveModelDecorator from '../decorators/observe-model';
import {RemotePropType, BranchPropType} from '../prop-types';

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

@ObserveModelDecorator({
  getModel: props => props.repository,
  fetchData: repo => {
    return yubikiri({
      remotes: repo.getRemotes().then(remotes => {
        return remotes.map(({name, url}) => ({name, url, info: Repository.githubInfoFromRemote(url)}))
          .filter(remote => remote.info.githubRepo);
      }),
      currentBranch: repo.getCurrentBranch(),
      selectedRemote: repo.getConfig('atomGithub.currentRemote'),
    });
  },
})
export default class GithubTabController extends React.Component {
  static propTypes = {
    repository: PropTypes.object,
    remotes: PropTypes.arrayOf(RemotePropType.isRequired),
    currentBranch: BranchPropType,
    selectedRemote: PropTypes.string,
  }

  static defaultProps = {
    remotes: null,
    currentBranch: {name: '', isDetached: false},
    selectedRemote: null,
  }

  constructor(props, context) {
    super(props, context);
    this.loginModel = GithubLoginModel.get();
  }

  render() {
    if (!this.props.repository || !this.props.remotes) {
      return null;
    }

    if (!this.props.currentBranch || this.props.currentBranch.isDetached) {
      return null;
    }

    let remote = this.props.remotes.find(r => r.name === this.props.selectedRemote);
    let manyRemotesAvailable = false;
    if (!remote && this.props.remotes.length === 1) {
      remote = this.props.remotes[0];
    } else if (!remote && this.props.remotes.length > 1) {
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
              currentBranchName={this.props.currentBranch.name}
            />
          }
          {!remote && manyRemotesAvailable &&
            <RemoteSelector
              remotes={this.props.remotes}
              currentBranchName={this.props.currentBranch.name}
              selectRemote={this.handleRemoteSelect}
            />
          }
          {!remote && !manyRemotesAvailable && this.renderNoRemotes()}
        </div>
      </div>
    );
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
