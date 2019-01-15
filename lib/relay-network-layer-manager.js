import util from 'util';
import {Environment, Network, RecordSource, Store} from 'relay-runtime';
import moment from 'moment';
import hubKit from 'hubkit-client';

const relayEnvironmentPerURL = new Map();
const tokenPerURL = new Map();
const fetchPerURL = new Map();

const responsesByQuery = new Map();

function logRatelimitApi(headers) {
  const remaining = headers.get('x-ratelimit-remaining');
  const total = headers.get('x-ratelimit-limit');
  const resets = headers.get('x-ratelimit-reset');
  const resetsIn = moment.unix(parseInt(resets, 10)).from();

  // eslint-disable-next-line no-console
  console.debug(`GitHub API Rate Limit: ${remaining}/${total} — resets ${resetsIn}`);
}

export function expectRelayQuery(operationPattern, response) {
  let resolve, reject;
  const promise = new Promise((resolve0, reject0) => {
    resolve = () => resolve0({data: response});
    reject = reject0;
  });

  const existing = responsesByQuery.get(operationPattern.name) || [];
  existing.push({
    promise,
    response,
    variables: operationPattern.variables || {},
    trace: operationPattern.trace,
  });
  responsesByQuery.set(operationPattern.name, existing);

  const disable = () => responsesByQuery.delete(operationPattern.name);

  return {promise, resolve, reject, disable};
}

export function clearRelayExpectations() {
  responsesByQuery.clear();
}

function createFetchQuery(url) {
  if (atom.inSpecMode()) {
    return function specFetchQuery(operation, variables, _cacheConfig, _uploadables) {
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

      if (match.trace) {
        match.promise.then(result => {
          // eslint-disable-next-line no-console
          console.log(
            `GraphQL query ${operation.name} was:\n` +
            util.inspect(variables) + '\n' +
            util.inspect(result, {depth: null}),
          );
        });
      }

      return match.promise;
    };
  }

  return async function fetchQuery(operation, variables, _cacheConfig, _uploadables) {
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
      e.responseText = await response.text();
      e.rawStack = e.stack;
      throw e;
    }

    const payload = await response.json();

    if (payload.data && payload.data.errors && payload.data.errors.length > 0) {
      const e = new Error(`GraphQL API endpoint at ${url} returned an error for query ${operation.name}.`);
      e.response = response;
      e.errors = payload.data.errors;
      e.rawStack = e.stack;
      throw e;
    }

    return payload;
  };
}

export default class RelayNetworkLayerManager {
  static getEnvironmentForHost(endpoint, token) {
    const url = endpoint.getGraphQLRoot();
    let {environment, network} = relayEnvironmentPerURL.get(url) || {};
    tokenPerURL.set(url, token);
    if (!environment) {
      const source = new RecordSource();
      const store = new Store(source);
      network = Network.create(this.getFetchQuery(endpoint, token));
      environment = new Environment({network, store});

      relayEnvironmentPerURL.set(url, {environment, network});
    }
    return environment;
  }

  static getFetchQuery(endpoint, token) {
    const url = endpoint.getGraphQLRoot();
    tokenPerURL.set(url, token);
    let fetch = fetchPerURL.get(url);
    if (!fetch) {
      fetch = createFetchQuery(url);
      fetchPerURL.set(fetch);
    }
    return fetch;
  }

  static _hubKitEnvironment = null
  static async getHubKit() {
    if (this._hubKitEnvironment) { return this._hubKitEnvironment; }
    const kit = await hubKit();
    console.log('Found HubKit:', kit);
    const {http, auth} = kit;
    const source = new RecordSource();
    const store = new Store(source);
    const network = Network.create(
      async function fetchQuery(operation, variables, _cacheConfig, _uploadables) {
        const response = await fetch(http, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'Authorization': auth && `bearer ${auth.token}`,
          },
          body: JSON.stringify({
            query: operation.text,
            variables,
          }),
        });

        try {
          /* istanbul ignore next  */
          atom && atom.inDevMode() && logRatelimitApi(response.headers);
        } catch (_e) { /* do nothing */ }

        if (response.status !== 200) {
          const e = new Error(`GraphQL API endpoint at ${http} returned ${response.status}`);
          e.response = response;
          e.responseText = await response.text();
          e.rawStack = e.stack;
          throw e;
        }

        const payload = await response.json();
        console.log('from hubkit:', payload);

        if (payload.data && payload.data.errors && payload.data.errors.length > 0) {
          const e = new Error(`GraphQL API endpoint at ${http} returned an error for query ${operation.name}.`);
          e.response = response;
          e.errors = payload.data.errors;
          e.rawStack = e.stack;
          throw e;
        }

        return payload;
      },
    );
    return this._hubKitEnvironment = new Environment({network, store});
  }
}
