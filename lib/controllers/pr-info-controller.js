import React from 'react';
import Relay from 'react-relay';

import {RemotePropType} from '../prop-types';
import RelayRootContainer from '../containers/relay-root-container';
import PrListContainer from '../containers/pr-list-container';

const environmentByGithubInstance = new Map();

const getEnvironmentForInstance = (instance, endpoint, token) => {
  let environment = environmentByGithubInstance.get(instance);
  if (!environment) {
    environment = new Relay.Environment();
    environment.injectNetworkLayer(
      new Relay.DefaultNetworkLayer(`${endpoint}/graphql`, {
        headers: {
          Authorization: `bearer ${token}`,
        },
      }),
    );
    environmentByGithubInstance.set(instance, environment);
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
    currentBranch: React.PropTypes.string.isRequired,
    remote: RemotePropType.isRequired,
  }

  render() {
    const {token, endpoint, instance} = this.props;

    const route = new PrInfoRoute({
      repoOwner: this.props.remote.info.owner,
      repoName: this.props.remote.info.name,
      branchName: this.props.currentBranch,
    });

    const environment = getEnvironmentForInstance(instance, endpoint, token);

    return (
      <RelayRootContainer
        Component={PrListContainer}
        route={route}
        environment={environment}
      />
    );
  }
}
