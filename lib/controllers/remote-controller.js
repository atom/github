import React from 'react';
import PropTypes from 'prop-types';
import {shell} from 'electron';

import {autobind} from '../helpers';
import {RemotePropType, RemoteSetPropType, BranchSetPropType, OperationStateObserverPropType} from '../prop-types';
import IssueishSearchesController from './issueish-searches-controller';

export default class RemoteController extends React.Component {
  static propTypes = {
    host: PropTypes.string.isRequired,
    token: PropTypes.string.isRequired,

    repository: PropTypes.shape({
      id: PropTypes.string.isRequired,
      defaultBranchRef: PropTypes.shape({
        prefix: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
      }),
    }),

    remoteOperationObserver: OperationStateObserverPropType.isRequired,
    workspace: PropTypes.object.isRequired,
    remote: RemotePropType.isRequired,
    remotes: RemoteSetPropType.isRequired,
    branches: BranchSetPropType.isRequired,

    aheadCount: PropTypes.number,
    pushInProgress: PropTypes.bool.isRequired,

    onPushBranch: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props);
    autobind(this, 'onCreatePr');
  }

  render() {
    return (
      <IssueishSearchesController
        host={this.props.host}
        token={this.props.token}

        remoteOperationObserver={this.props.remoteOperationObserver}
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

  async onCreatePr() {
    const currentBranch = this.props.branches.getHeadBranch();
    const upstream = currentBranch.getUpstream();
    if (!upstream.isPresent() || this.props.aheadCount > 0) {
      await this.props.onPushBranch();
    }

    let createPrUrl = 'https://github.com/';
    createPrUrl += this.props.remote.getOwner() + '/' + this.props.remote.getRepo();
    createPrUrl += '/compare/' + encodeURIComponent(currentBranch.getName());
    createPrUrl += '?expand=1';

    return new Promise((resolve, reject) => {
      shell.openExternal(createPrUrl, {}, err => {
        if (err) { reject(err); } else { resolve(); }
      });
    });
  }
}
