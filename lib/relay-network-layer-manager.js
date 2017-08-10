import {Environment, Network, RecordSource, Store} from 'relay-runtime';
import moment from 'moment';

const relayEnvironmentPerGithubHost = new Map();

function logRatelimitApi(headers) {
  const remaining = headers.get('x-ratelimit-remaining');
  const total = headers.get('x-ratelimit-limit');
  const resets = headers.get('x-ratelimit-reset');
  const resetsIn = moment.unix(parseInt(resets, 10)).from();

  // eslint-disable-next-line no-console
  console.debug(`GitHub API Rate Limit: ${remaining}/${total} — resets ${resetsIn}`);
}

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
      try {
        atom && atom.inDevMode() && logRatelimitApi(response.headers);
      } catch (_e) { /* do nothing */ }

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

      relayEnvironmentPerGithubHost.set(host, {environment, network});
    } else {
    }
    return environment;
  }
}
