import React from 'react';
import PropTypes from 'prop-types';
import {autobind} from 'core-decorators';
import yubikiri from 'yubikiri';

import ObserveModelDecorator from '../decorators/observe-model';
import GithubLoginView from '../views/github-login-view';
import {UNAUTHENTICATED} from '../models/github-login-model';
import {nullRemote} from '../models/remote';
import RemoteRepoInputBox from '../views/remote-repo-input-box';
import RemoteCreateForm from '../views/remote-create-form';
import Octicon from '../views/octicon';

@ObserveModelDecorator({
  getModel: props => props.loginModel,
  fetchData: (loginModel, {host}) => {
    return yubikiri({
      token: loginModel.getToken(host),
    });
  },
})
export default class RemoteRepoController extends React.Component {
  static propTypes = {
    loginModel: PropTypes.object.isRequired,
    host: PropTypes.string, // fully qualified URI to the API endpoint, e.g. 'https://api.github.com'
    token: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.symbol,
    ]),
  }

  static defaultProps = {
    host: 'https://api.github.com',
    remote: nullRemote,
    token: null,
  }

  render() {
    const {token} = this.props;
    return (
      <div className="github-RemoteRepoController">
        {token && token !== UNAUTHENTICATED &&
          <div className="github-RemoteRepoController-Container">
            <div className="github-RemoteRepoController-Subview">
              <Octicon icon="octoface" />
              <p>This repository does not have any remotes hosted at GitHub.com.</p>

              <RemoteRepoInputBox>
                <p>You can manually add a remote to the current repo by entering its URL:</p>
              </RemoteRepoInputBox>
              <RemoteCreateForm>
                <p>You can also create a new GitHub repo:</p>
              </RemoteCreateForm>
            </div>
          </div>
        }
        {(!token || token === UNAUTHENTICATED) && <GithubLoginView onLogin={this.handleLogin} />}
      </div>
    );
  }

  @autobind
  handleLogin(token) {
    this.props.loginModel.setToken(this.props.host, token);
  }
}
