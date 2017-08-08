import Relay from 'react-relay/classic';

export default class UserMentionTooltipRoute extends Relay.Route {
  static routeName = 'user-mention-tooltip-route'

  static queries = {
    repositoryOwner: Component => Relay.QL`
      query {
        repositoryOwner(login: $username) {
          ${Component.getFragment('repositoryOwner')}
        }
      }
    `,
  }

  static paramDefinitions = {
    username: {required: true},
  }
}
