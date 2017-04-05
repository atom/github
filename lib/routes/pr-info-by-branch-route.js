import Relay from 'react-relay';

export default class PrInfoByBranchRoute extends Relay.Route {
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
