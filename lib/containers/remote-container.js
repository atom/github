import React from 'react';
import PropTypes from 'prop-types';
import {QueryRenderer, graphql} from 'react-relay';

import {autobind} from '../helpers';
import {RemotePropType, BranchSetPropType} from '../prop-types';
import RelayNetworkLayerManager from '../relay-network-layer-manager';
import {UNAUTHENTICATED, INSUFFICIENT} from '../shared/keytar-strategy';
import RemoteController from '../controllers/remote-controller';
import ObserveModel from '../views/observe-model';
import LoadingView from '../views/loading-view';
import GithubLoginView from '../views/github-login-view';

export default class RemoteContainer extends React.Component {
  static propTypes = {
    loginModel: PropTypes.object.isRequired,

    host: PropTypes.string.isRequired,

    workspace: PropTypes.object.isRequired,
    remote: RemotePropType.isRequired,
    branches: BranchSetPropType.isRequired,

    aheadCount: PropTypes.number,
    pushInProgress: PropTypes.bool.isRequired,

    onPushBranch: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props);

    autobind(this, 'fetchToken', 'renderWithToken', 'renderWithResult', 'handleLogin', 'handleLogout');
  }

  fetchToken(loginModel) {
    return loginModel.getToken(this.props.host);
  }

  render() {
    return (
      <ObserveModel model={this.props.loginModel} fetchData={this.fetchToken}>
        {this.renderWithToken}
      </ObserveModel>
    );
  }

  renderWithToken(token) {
    if (token === null) {
      return <LoadingView />;
    }

    if (token === UNAUTHENTICATED) {
      return <GithubLoginView onLogin={this.handleLogin} />;
    }

    if (token === INSUFFICIENT) {
      return (
        <GithubLoginView onLogin={this.handleLogin}>
          <p>
            Your token no longer has sufficient authorizations. Please re-authenticate and generate a new one.
          </p>
        </GithubLoginView>
      );
    }

    const environment = RelayNetworkLayerManager.getEnvironmentForHost(this.props.host, token);
    const query = graphql`
      query remoteContainerQuery($owner: String!, $name: String!) {
        repository(owner: $owner, name: $name) {
          defaultBranchRef {
            prefix
            name
          }
        }
      }
    `;
    const variables = {
      owner: this.props.remote.getOwner(),
      name: this.props.remote.getRepo(),
    };

    return (
      <QueryRenderer
        environment={environment}
        variables={variables}
        query={query}
        render={result => this.renderWithResult(result, token)}
      />
    );
  }

  renderWithResult({error, props}, token) {
    if (props === null) {
      return <LoadingView />;
    }

    return (
      <RemoteController
        host={this.props.host}
        token={token}

        repository={props.repository}

        workspace={this.props.workspace}
        remote={this.props.remote}
        branches={this.props.branches}

        aheadCount={this.props.aheadCount}
        pushInProgress={this.props.pushInProgress}

        onPushBranch={this.props.onPushBranch}
      />
    );
  }

  handleLogin(token) {
    this.props.loginModel.setToken(this.props.host, token);
  }

  handleLogout() {
    this.props.loginModel.removeToken(this.props.host);
  }
}
