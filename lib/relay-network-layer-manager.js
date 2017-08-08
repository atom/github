import Relay from 'react-relay/classic';

const relayEnvironmentPerGithubHost = new Map();

export default class RelayNetworkLayerManager {
  static getEnvironmentForHost(host, token) {
    host = host === 'github.com' ? 'https://api.github.com' : host; // eslint-disable-line no-param-reassign
    const url = host === 'https://api.github.com' ? `${host}/graphql` : `${host}/api/v3/graphql`;
    const config = relayEnvironmentPerGithubHost.get(host) || {};
    let {environment, networkLayer} = config;
    if (!environment) {
      environment = new Relay.Environment();
      networkLayer = new Relay.DefaultNetworkLayer(url, {
        headers: {
          Authorization: `bearer ${token}`,
          Accept: 'application/vnd.github.graphql-profiling+json',
        },
      });
      environment.injectNetworkLayer(networkLayer);
      relayEnvironmentPerGithubHost.set(host, {environment, networkLayer});
    } else {
      networkLayer._init.headers = {
        Authorization: `bearer ${token}`,
      };
    }
    return environment;
  }
}
