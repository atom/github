import React from 'react';
import Relay from 'react-relay';

import {RemotePropType} from '../prop-types';
import RelayRootContainer from '../containers/relay-root-container';
import PrListContainer from '../containers/pr-list-container';
import GithubLoginView from '../views/github-login-view';

const relayConfigByGithubInstance = new Map();

const getEnvironmentForInstance = (instance, endpoint, token) => {
  const config = relayConfigByGithubInstance.get(instance) || {};
  let {environment, networkLayer} = config;
  if (!environment) {
    environment = new Relay.Environment();
    networkLayer = new Relay.DefaultNetworkLayer(`${endpoint}/graphql`, {
      headers: {
        Authorization: `bearer ${token}`,
      },
    });
    environment.injectNetworkLayer(networkLayer);
    relayConfigByGithubInstance.set(instance, {environment, networkLayer});
  } else {
    networkLayer._init.headers = {
      Authorization: `bearer ${token}`,
    };
  }
  return environment;
};

class PrInfoRoute extends Relay.Route {
  static routeName = 'pr-info-route'

  static queries = {
    query: (Component, variables) => Relay.QL`
      query {
        relay {
          ${Component.getFragment('query', variables)}
        }
      }
    `,
  }

  static paramDefinitions = {
    repoOwner: {required: true},
    repoName: {required: true},
    branchName: {required: true},
  }
}

export default class PrInfoController extends React.Component {
  static propTypes = {
    endpoint: React.PropTypes.string.isRequired,
    token: React.PropTypes.string.isRequired,
    instance: React.PropTypes.string.isRequired,
    currentBranchName: React.PropTypes.string.isRequired,
    loginModel: React.PropTypes.object.isRequired,
    onLogin: React.PropTypes.func.isRequired,
    remote: RemotePropType.isRequired,
  }

  render() {
    const {token, endpoint, instance} = this.props;

    const route = new PrInfoRoute({
      repoOwner: this.props.remote.info.owner,
      repoName: this.props.remote.info.name,
      branchName: this.props.currentBranchName,
    });

    const environment = getEnvironmentForInstance(instance, endpoint, token);

    return (
      <RelayRootContainer
        Component={PrListContainer}
        route={route}
        environment={environment}
        renderLoading={() => {
          return <div>Loading...</div>;
        }}
        renderFailure={(err, retry) => {
          if (err.response && err.response.status === 401) {
            return (
              <div>
                The API endpoint returned a unauthorized error. Please try to re-authenticate with the endpoint.
                <GithubLoginView onLogin={this.props.onLogin} />
              </div>
            );
          } else {
            return <div>An unknown error occurred.</div>;
          }
        }}
      />
    );
  }
}
