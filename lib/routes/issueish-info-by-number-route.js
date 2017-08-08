import Relay from 'react-relay/classic';

export default class IssueishInfoByNumberRoute extends Relay.Route {
  static routeName = 'pr-info-by-number-route'

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
    issueishNumber: {required: true},
  }
}
