import React from 'react';
import {autobind} from 'core-decorators';

import RemotePrController from './remote-pr-controller';
import Repository from '../models/repository';
import GithubLoginModel from '../models/github-login-model';
import ObserveModel from '../decorators/observe-model';
import {RemotePropType} from '../prop-types';

class RemoteSelector extends React.Component {
  static propTypes = {
    remotes: React.PropTypes.arrayOf(RemotePropType).isRequired,
    currentBranch: React.PropTypes.string.isRequired,
    selectRemote: React.PropTypes.func.isRequired,
  }

  render() {
    const {remotes, currentBranch, selectRemote} = this.props;
    return (
      <div className="github-RemoteSelector">
        <p>
          This repository has multiple remotes hosted at GitHub.com.
          Select a remote to see pull requests associated
          with the <strong>{currentBranch}</strong> branch.
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


@ObserveModel({
  getModel: props => props.repository,
  fetchData: async repo => {
    let remotes = await repo.getRemotes();
    const currentBranch = await repo.getCurrentBranch();
    const selectedRemote = await repo.getConfig('atomGithub.currentRemote');
    remotes = remotes.map(({name, url}) => ({name, url, info: Repository.githubInfoFromRemote(url)}))
      .filter(remote => remote.info.githubRepo);
    return {remotes, currentBranch, selectedRemote};
  },
})
export default class GithubController extends React.Component {
  static propTypes = {
    repository: React.PropTypes.object,
    remotes: React.PropTypes.arrayOf(RemotePropType.isRequired),
    currentBranch: React.PropTypes.string,
    selectedRemote: React.PropTypes.string,
  }

  static defaultProps = {
    remotes: null,
    currentBranch: '',
    selectedRemote: null,
  }

  constructor(props, context) {
    super(props, context);
    this.loginModel = new GithubLoginModel();
  }

  render() {
    if (!this.props.repository || !this.props.remotes) {
      return <div />;
    }

    let remote = this.props.remotes.find(r => r.name === this.props.selectedRemote);
    let remotesAvailable = false;
    if (!remote && this.props.remotes.length === 1) {
      remote = this.props.remotes[0];
    } else if (!remote && this.props.remotes.length > 1) {
      remotesAvailable = true;
    }

    return (
      <div className="github-GithubController">
        <div className="github-GithubController-content">
          {/* only supporting GH.com for now, hardcoded values */}
          {remote &&
            <RemotePrController
              instance="github.com"
              endpoint="https://api.github.com/"
              loginModel={this.loginModel}
              remote={remote}
              currentBranch={this.props.currentBranch}
            />
          }
          {!remote && remotesAvailable &&
            <RemoteSelector
              remotes={this.props.remotes}
              currentBranch={this.props.currentBranch}
              selectRemote={this.handleRemoteSelect}
            />
          }
          {!remote && !remotesAvailable && this.renderNoRemotes()}
        </div>
      </div>
    );
  }

  renderNoRemotes() {
    return (
      <div className="github-GithubController-no-remotes">
        This repository does not have any remotes hosted at GitHub.com.
      </div>
    );
  }

  componentWillUnmount() {
    this.loginModel.destroy();
  }

  @autobind
  handleRemoteSelect(e, remote) {
    e.preventDefault();
    this.props.repository.setConfig('atomGithub.currentRemote', remote.name);
  }
}
