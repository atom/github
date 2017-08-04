import React from 'react';
import Relay from 'react-relay';
import PropTypes from 'prop-types';

export class PrStatusContext extends React.Component {
  static propTypes = {
    context: PropTypes.shape({
      context: PropTypes.string.isRequired,
      description: PropTypes.string,
      state: PropTypes.string.isRequired,
      targetUrl: PropTypes.string,
      creator: PropTypes.shape({
        avatarUrl: PropTypes.string.isRequired,
        login: PropTypes.string.isRequired,
      }),
    }).isRequired,
  }

  render() {
    const {context, description, state, targetUrl, creator} = this.props.context;
    return (
      <li className="github-PrInfo-statuses">
        <div>creator: {creator.login}</div>
        <div>context: {context}</div>
        <div>description: {description}</div>
        <div>state: {state}</div>
        <div>targetUrl: {targetUrl}</div>
      </li>
    );
  }
}

export default Relay.createContainer(PrStatusContext, {
  fragments: {
    context: () => Relay.QL`
      fragment on StatusContext {
        context description state targetUrl
        creator {
          avatarUrl login
        }
      }
    `,
  },
});
