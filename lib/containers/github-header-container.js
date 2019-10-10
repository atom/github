import React from 'react';
import PropTypes from 'prop-types';
import {QueryRenderer, graphql} from 'react-relay';

import {incrementCounter} from '../reporter-proxy';
import {EndpointPropType, RemoteSetPropType} from '../prop-types';
import RelayNetworkLayerManager from '../relay-network-layer-manager';
import {UNAUTHENTICATED, INSUFFICIENT} from '../shared/keytar-strategy';
import ObserveModel from '../views/observe-model';
import QueryErrorView from '../views/query-error-view';
import GithubHeaderView from '../views/github-header-view';

export default class GithubHeaderContainer extends React.Component {
  static propTypes = {
    // Connection
    loginModel: PropTypes.object.isRequired,
    endpoint: EndpointPropType.isRequired,

    avatarUrl: PropTypes.string,
    remotes: RemoteSetPropType.isRequired,
    currentRemoteName: PropTypes.string.isRequired,

    handleRemoteSelect: PropTypes.func.isRequired,
  }

  fetchToken = loginModel => {
    return loginModel.getToken(this.props.endpoint.getLoginAccount());
  }

  render() {
    return (
      <ObserveModel model={this.props.loginModel} fetchData={this.fetchToken}>
        {this.renderWithToken}
      </ObserveModel>
    );
  }

  renderWithToken = token => {
    if (token === null) {
      return this.renderWithBlankAvatar();
    }

    if (token instanceof Error) {
      return (
        <QueryErrorView
          error={token}
          retry={this.handleTokenRetry}
          login={this.handleLogin}
          logout={this.handleLogout}
        />
      );
    }

    if (token === UNAUTHENTICATED || token === INSUFFICIENT) {
      return this.renderWithBlankAvatar();
    }

    const environment = RelayNetworkLayerManager.getEnvironmentForHost(this.props.endpoint, token);
    const query = graphql`
          query githubHeaderContainerQuery {
            viewer {
              avatarUrl
            }
          }
        `;

    return (
      <QueryRenderer
        environment={environment}
        variables={{}}
        query={query}
        render={result => this.renderWithResult(result, token)}
      />
    );
  }

  renderWithResult({error, props, retry}, token) {
    const avatarUrl = !error && props !== null ? props.viewer.avatarUrl : null;

    return (
      <GithubHeaderView
        avatarUrl={avatarUrl}
        remotes={this.props.remotes}
        currentRemoteName={this.props.currentRemoteName}

        handleRemoteSelect={this.handleRemoteSelect}
      />
    );
  }

  renderWithBlankAvatar = () => this.renderWithResult({props: null});

  handleLogin = token => {
    incrementCounter('github-login');
    this.props.loginModel.setToken(this.props.endpoint.getLoginAccount(), token);
  }

  handleLogout = () => {
    incrementCounter('github-logout');
    this.props.loginModel.removeToken(this.props.endpoint.getLoginAccount());
  }

  handleTokenRetry = () => this.props.loginModel.didUpdate();
}
