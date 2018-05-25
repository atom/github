import util from 'util';
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

const responsesByQuery = new Map();

export function expectRelayQuery(operationPattern, response) {
  let resolve, reject;
  const promise = new Promise((resolve0, reject0) => {
    resolve = () => resolve0({data: response});
    reject = reject0;
  });

  const existing = responsesByQuery.get(operationPattern.name) || [];
  existing.push({promise, response, variables: operationPattern.variables || {}});
  responsesByQuery.set(operationPattern.name, existing);

  const disable = () => responsesByQuery.delete(operationPattern.name);

  return {promise, resolve, reject, disable};
}

export function clearRelayExpectations() {
  responsesByQuery.clear();
}

const tokenPerURL = new Map();
const fetchPerURL = new Map();

function createFetchQuery(url) {
  if (atom.inSpecMode()) {
    return function specFetchQuery(operation, variables, cacheConfig, uploadables) {
      const expectations = responsesByQuery.get(operation.name) || [];
      const match = expectations.find(expectation => {
        if (Object.keys(expectation.variables).length !== Object.keys(variables).length) {
          return false;
        }

        for (const key in expectation.variables) {
          if (expectation.variables[key] !== variables[key]) {
            return false;
          }
        }

        return true;
      });

      if (!match) {
        // eslint-disable-next-line no-console
        console.log(
          `GraphQL query ${operation.name} was:\n  ${operation.text.replace(/\n/g, '\n  ')}\n` +
          util.inspect(variables),
        );

        const e = new Error(`Unexpected GraphQL query: ${operation.name}`);
        e.rawStack = e.stack;
        throw e;
      }

      return match.promise;
    };
  }

  return async function fetchQuery(operation, variables, cacheConfig, uploadables) {
    const currentToken = tokenPerURL.get(url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'Authorization': `bearer ${currentToken}`,
        'Accept': 'application/vnd.github.graphql-profiling+json',
      },
      body: JSON.stringify({
        query: operation.text,
        variables,
      }),
    });

    try {
      atom && atom.inDevMode() && logRatelimitApi(response.headers);
    } catch (_e) { /* do nothing */ }

    if (response.status !== 200) {
      const e = new Error(`GraphQL API endpoint at ${url} returned ${response.status}`);
      e.response = response;
      e.rawStack = e.stack;
      throw e;
    }

    return response.json();
  };
}

export default class RelayNetworkLayerManager {
  static getEnvironmentForHost(host, token) {
    host = host === 'github.com' ? 'https://api.github.com' : host;
    const url = host === 'https://api.github.com' ? `${host}/graphql` : `${host}/api/v3/graphql`;
    let {environment, network} = relayEnvironmentPerGithubHost.get(host) || {};
    tokenPerURL.set(url, token);
    if (!environment) {
      const source = new RecordSource();
      const store = new Store(source);
      network = Network.create(this.getFetchQuery(url));
      environment = new Environment({network, store});

      relayEnvironmentPerGithubHost.set(host, {environment, network});
    }
    return environment;
  }

  static getFetchQuery(url, token) {
    tokenPerURL.set(url, token);
    let fetch = fetchPerURL.get(url);
    if (!fetch) {
      fetch = createFetchQuery(url);
      fetchPerURL.set(fetch);
    }
    return fetch;
  }
}
