import React from 'react';
import PropTypes from 'prop-types';
import yubikiri from 'yubikiri';
import {shell} from 'electron';

import {RemotePropType, BranchSetPropType} from '../prop-types';
import LoadingView from '../views/loading-view';
import GithubLoginView from '../views/github-login-view';
import ObserveModel from '../views/observe-model';
import {UNAUTHENTICATED, INSUFFICIENT} from '../shared/keytar-strategy';
import {nullRemote} from '../models/remote';
import IssueishSearchController from './issueish-search-controller';
import {autobind} from '../helpers';

export default class RemoteController extends React.Component {
  static propTypes = {
    loginModel: PropTypes.object.isRequired,
    host: PropTypes.string, // fully qualified URI to the API endpoint, e.g. 'https://api.github.com'

    remote: RemotePropType.isRequired,
    branches: BranchSetPropType.isRequired,

    aheadCount: PropTypes.number,
    pushInProgress: PropTypes.bool.isRequired,

    onPushBranch: PropTypes.func.isRequired,
  }

  static defaultProps = {
    host: 'https://api.github.com',
    remote: nullRemote,
  }

  constructor(props) {
    super(props);
    autobind(this, 'fetchData', 'handleLogin', 'handleLogout', 'onCreatePr');
  }

  fetchData(loginModel) {
    return yubikiri({
      token: loginModel.getToken(this.props.host),
    });
  }

  render() {
    return (
      <ObserveModel model={this.props.loginModel} fetchData={this.fetchData}>
        {data => this.renderWithData(data || {token: null})}
      </ObserveModel>
    );
  }

  renderWithData({token}) {
    let inner;
    if (token === null) {
      inner = <LoadingView />;
    } else if (token === UNAUTHENTICATED) {
      inner = <GithubLoginView onLogin={this.handleLogin} />;
    } else if (token === INSUFFICIENT) {
      inner = (
        <GithubLoginView onLogin={this.handleLogin}>
          <p>
            Your token no longer has sufficient authorizations. Please re-authenticate and generate a new one.
          </p>
        </GithubLoginView>
      );
    } else {
      inner = (
        <IssueishSearchController
          host={this.props.host}
          token={token}

          repository={null}

          remote={this.props.remote}
          branches={this.props.branches}
          aheadCount={this.props.aheadCount}
          pushInProgress={this.props.pushInProgress}

          onCreatePr={this.onCreatePr}
        />
      );
    }

    return <div className="github-RemotePrController">{inner}</div>;
  }

  handleLogin(token) {
    this.props.loginModel.setToken(this.props.host, token);
  }

  handleLogout() {
    this.props.loginModel.removeToken(this.props.host);
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
