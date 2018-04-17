import React from 'react';
import PropTypes from 'prop-types';
import {autobind} from 'core-decorators';
import yubikiri from 'yubikiri';
import {shell} from 'electron';

import {RemotePropType, BranchSetPropType} from '../prop-types';
import GithubLoginView from '../views/github-login-view';
import ObserveModel from '../views/observe-model';
import {UNAUTHENTICATED} from '../shared/keytar-strategy';
import {nullRemote} from '../models/remote';
import PrInfoController from './pr-info-controller';

export default class RemotePrController extends React.Component {
  static propTypes = {
    loginModel: PropTypes.object.isRequired,
    host: PropTypes.string, // fully qualified URI to the API endpoint, e.g. 'https://api.github.com'
    remote: RemotePropType.isRequired,
    branches: BranchSetPropType.isRequired,
    selectedPrUrl: PropTypes.string,
    aheadCount: PropTypes.number,
    pushInProgress: PropTypes.bool.isRequired,
    onSelectPr: PropTypes.func.isRequired,
    onUnpinPr: PropTypes.func.isRequired,
    onPushBranch: PropTypes.func.isRequired,
  }

  static defaultProps = {
    host: 'https://api.github.com',
    remote: nullRemote,
  }

  fetchData = loginModel => {
    return yubikiri({
      token: loginModel.getToken(this.props.host),
    });
  }

  render() {
    return (
      <ObserveModel model={this.props.loginModel} fetchData={this.fetchData}>
        {this.renderWithData}
      </ObserveModel>
    );
  }

  renderWithData = (loginData = {token: null}) => {
    const {
      host, remote, branches, loginModel, selectedPrUrl,
      aheadCount, pushInProgress, onSelectPr, onUnpinPr,
    } = this.props;
    const token = loginData.token;

    return (
      <div className="github-RemotePrController">
        {token && token !== UNAUTHENTICATED && <PrInfoController
          {...{
            host, remote, branches, token, loginModel, selectedPrUrl,
            aheadCount, pushInProgress, onSelectPr, onUnpinPr,
          }}
          onLogin={this.handleLogin}
          onLogout={this.handleLogout}
          onCreatePr={this.handleCreatePr}
                                               />
          }
        {(!token || token === UNAUTHENTICATED) && <GithubLoginView onLogin={this.handleLogin} />}
      </div>
    );
  }

  @autobind
  handleLogin(token) {
    this.props.loginModel.setToken(this.props.host, token);
  }

  @autobind
  handleLogout() {
    this.props.loginModel.removeToken(this.props.host);
  }

  @autobind
  async handleCreatePr() {
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
