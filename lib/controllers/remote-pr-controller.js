import React from 'react';
import PropTypes from 'prop-types';
import {autobind} from 'core-decorators';
import yubikiri from 'yubikiri';

import {RemotePropType} from '../prop-types';
import ObserveModelDecorator from '../decorators/observe-model';
import GithubLoginView from '../views/github-login-view';
import {UNAUTHENTICATED} from '../models/github-login-model';
import {nullRemote} from '../models/remote';
import PrInfoController from './pr-info-controller';

@ObserveModelDecorator({
  getModel: props => props.loginModel,
  fetchData: (loginModel, {host}) => {
    return yubikiri({
      token: loginModel.getToken(host),
    });
  },
})
export default class RemotePrController extends React.Component {
  static propTypes = {
    loginModel: PropTypes.object.isRequired,
    host: PropTypes.string, // fully qualified URI to the API endpoint, e.g. 'https://api.github.com'
    remote: RemotePropType.isRequired,
    token: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.symbol,
    ]),
    currentBranchName: PropTypes.string.isRequired,
    onSelectPr: PropTypes.func.isRequired,
    selectedPrUrl: PropTypes.string,
    onUnpinPr: PropTypes.func.isRequired,
  }

  static defaultProps = {
    host: 'https://api.github.com',
    remote: nullRemote,
    token: null,
  }

  render() {
    const {host, remote, currentBranchName, token, loginModel, selectedPrUrl, onSelectPr, onUnpinPr} = this.props;
    return (
      <div className="github-RemotePrController">
        {token && token !== UNAUTHENTICATED && <PrInfoController
          {...{host, remote, currentBranchName, token, loginModel, selectedPrUrl, onSelectPr, onUnpinPr}}
          onLogin={this.handleLogin}
          onLogout={this.handleLogout}
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
}
