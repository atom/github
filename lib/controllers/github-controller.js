import React from 'react';
import {autobind} from 'core-decorators';

import Repository from '../models/repository';
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
          Select a remote and we'll show you pull requests associated
          with this branch ({currentBranch}).
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

  render() {
    if (!this.props.remotes) {
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
          {remote && <div>Picked remote {remote.info.owner}/{remote.info.name}</div>}
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

  @autobind
  handleRemoteSelect(e, remote) {
    e.preventDefault();
    this.props.repository.setConfig('atomGithub.currentRemote', remote.name);
  }
}
