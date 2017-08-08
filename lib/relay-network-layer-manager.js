import Relay from 'react-relay';

const relayEnvironmentPerGithubHost = new Map();

function override(target, method, implementation) {
  const oldImplementation = target[method].bind(target);
  target[method] = implementation(oldImplementation);
}

function sendQueriesOverride(originalSendQueries) {
  return function sendQueriesWithRateLimitReq(requests) {
    requests.forEach(request => {
      override(request, 'getQueryString', getQueryStringOverride);
      request.then(data => logRateLimitInfo(data.response));
    });
    return originalSendQueries(requests);
  };
}

function getQueryStringOverride(originalGetQueryString) {
  return function getQueryStringInjectingRateLimitReq() {
    const str = originalGetQueryString();
    return str.replace(/query (.*\{)/, 'query $1 ghRateLimit:relay { rateLimit { limit cost remaining resetAt } } ');
  };
}

function logRateLimitInfo(response) {
  if (response && response.ghRateLimit) {
    console.table(response.ghRateLimit); // eslint-disable-line no-console
  }
}

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
      if (atom && atom.inDevMode()) {
        override(networkLayer, 'sendQueries', sendQueriesOverride);
      }
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
