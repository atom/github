import React from 'react';
import {autobind} from 'core-decorators';
import yubikiri from 'yubikiri';

import {RemotePropType} from '../prop-types';
import ObserveModelDecorator from '../decorators/observe-model';
import GithubLoginView from '../views/github-login-view';
import {UNAUTHENTICATED} from '../models/github-login-model';
import PrInfoController from './pr-info-controller';

@ObserveModelDecorator({
  getModel: props => props.loginModel,
  fetchData: (loginModel, {instance}) => {
    return yubikiri({
      token: loginModel.getToken(instance),
    });
  },
})
export default class RemotePrController extends React.Component {
  static propTypes = {
    loginModel: React.PropTypes.object.isRequired,
    instance: React.PropTypes.string, // string that identifies the instance, e.g. 'github.com'
    endpoint: React.PropTypes.string, // fully qualified URI to the API endpoint, e.g. 'https://api.github.com'
    remote: RemotePropType.isRequired,
    token: React.PropTypes.oneOfType([
      React.PropTypes.string,
      React.PropTypes.symbol,
    ]),
    currentBranchName: React.PropTypes.string.isRequired,
  }

  static defaultProps = {
    instance: 'https://api.github.com',
    endpoint: 'https://api.github.com',
    token: null,
  }

  render() {
    const {instance, endpoint, remote, currentBranchName, token, loginModel} = this.props;
    return (
      <div className="github-RemotePrController">
        {token && token !== UNAUTHENTICATED && <PrInfoController
          {...{instance, endpoint, remote, currentBranchName, token, loginModel}}
          onLogin={this.handleLogin}
                                               />
          }
        {!token && <GithubLoginView onLogin={this.handleLogin} />}
      </div>
    );
  }

  @autobind
  handleLogin(token) {
    this.props.loginModel.setToken(this.props.instance, token);
  }
}
