// import Relay from 'react-relay/classic';
import {Environment, Network, RecordSource, Store} from 'relay-runtime';

const relayEnvironmentPerGithubHost = new Map();

function createFetchQuery(url, token) {
  return function fetchQuery(operation, variables, cacheConfig, uploadables) {
    return fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'Authorization': `bearer ${token}`,
        'Accept': 'application/vnd.github.graphql-profiling+json',
      },
      body: JSON.stringify({
        query: operation.text,
        variables,
      }),
    }).then(response => {
      return response.json();
    });
  };
}

export default class RelayNetworkLayerManager {
  static getEnvironmentForHost(host, token) {
    host = host === 'github.com' ? 'https://api.github.com' : host; // eslint-disable-line no-param-reassign
    const url = host === 'https://api.github.com' ? `${host}/graphql` : `${host}/api/v3/graphql`;
    const config = relayEnvironmentPerGithubHost.get(host) || {};
    let {environment, network} = config;
    if (!environment) {
      const source = new RecordSource();
      const store = new Store(source);
      network = Network.create(createFetchQuery(url, token));
      environment = new Environment({network, store});

      // environment = new Relay.Environment();
      // networkLayer = new Relay.DefaultNetworkLayer(url, {
      //   headers: {
      //     Authorization: `bearer ${token}`,
      //     Accept: 'application/vnd.github.graphql-profiling+json',
      //   },
      // });
      // if (atom && atom.inDevMode()) {
      //   override(networkLayer, 'sendQueries', sendQueriesOverride);
      // }
      // environment.injectNetworkLayer(networkLayer);
      relayEnvironmentPerGithubHost.set(host, {environment, network});
    } else {
      // networkLayer._init.headers = {
      //   Authorization: `bearer ${token}`,
      // };
    }
    return environment;
  }
}
