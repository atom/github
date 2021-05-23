import React from 'react';
import PropTypes from 'prop-types';
import {shell} from 'electron';

import {incrementCounter} from '../reporter-proxy';
import {RemotePropType, RemoteSetPropType, BranchSetPropType, EndpointPropType, TokenPropType} from '../prop-types';
import IssueishSearchesController from './issueish-searches-controller';

export default class RemoteController extends React.Component {
  static propTypes = {
    // Relay payload
    repository: PropTypes.shape({
      id: PropTypes.string.isRequired,
      defaultBranchRef: PropTypes.shape({
        prefix: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
      }),
    }),

    // Connection
    endpoint: EndpointPropType.isRequired,
    token: TokenPropType.isRequired,

    // Repository derived attributes
    workingDirectory: PropTypes.string,
    workspace: PropTypes.object.isRequired,
    remote: RemotePropType.isRequired,
    remotes: RemoteSetPropType.isRequired,
    branches: BranchSetPropType.isRequired,
    aheadCount: PropTypes.number,
    pushInProgress: PropTypes.bool.isRequired,

    // Actions
    onPushBranch: PropTypes.func.isRequired,
  }

  render() {
    return (
      <IssueishSearchesController
        endpoint={this.props.endpoint}
        token={this.props.token}

        workingDirectory={this.props.workingDirectory}
        repository={this.props.repository}

        workspace={this.props.workspace}
        remote={this.props.remote}
        remotes={this.props.remotes}
        branches={this.props.branches}
        aheadCount={this.props.aheadCount}
        pushInProgress={this.props.pushInProgress}

        onCreatePr={this.onCreatePr}
      />
    );
  }

  onCreatePr = async () => {
    const currentBranch = this.props.branches.getHeadBranch();
    const upstream = currentBranch.getUpstream();
    if (!upstream.isPresent() || this.props.aheadCount > 0) {
      await this.props.onPushBranch();
    }

    let createPrUrl = 'https://github.com/';
    createPrUrl += this.props.remote.getOwner() + '/' + this.props.remote.getRepo();
    createPrUrl += '/compare/' + encodeURIComponent(currentBranch.getName());
    createPrUrl += '?expand=1';

    await shell.openExternal(createPrUrl);
    incrementCounter('create-pull-request');
  }
}
