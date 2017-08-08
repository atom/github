import Relay from 'react-relay/classic';

export default class IssueishTooltipRoute extends Relay.Route {
  static routeName = 'issueish-tooltip-route'

  static queries = {
    resource: Component => Relay.QL`
      query {
        resource(url: $issueishUrl) {
          ${Component.getFragment('resource')}
        }
      }
    `,
  }

  static paramDefinitions = {
    issueishUrl: {required: true},
  }
}
