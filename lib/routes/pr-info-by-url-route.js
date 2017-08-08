import Relay from 'react-relay/classic';

export default class PrInfoByUrlRoute extends Relay.Route {
  static routeName = 'pr-info-by-url-route'

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
    prUrl: {required: true},
  }
}
