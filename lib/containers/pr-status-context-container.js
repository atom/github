import React from 'react';
import Relay from 'react-relay/classic';
import PropTypes from 'prop-types';

import Octicon from '../views/octicon';
import {stateToIconAndStyle} from './pr-statuses-container';

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
    const {context, description, state, targetUrl} = this.props.context;
    const {icon, style} = stateToIconAndStyle[state];
    return (
      <li className="github-PrStatuses-list-item">
        <span className="github-PrStatuses-list-item-icon">
          <Octicon icon={icon} className={style} />
        </span>
        <span className="github-PrStatuses-list-item-context">
          <strong>{context}</strong><br />{description}
        </span>
        <span className="github-PrStatuses-list-item-details-link">
          <a href={targetUrl}>Details</a>
        </span>
      </li>
    );
  }
}

export default Relay.createContainer(PrStatusContext, {
  fragments: {
    context: () => Relay.QL`
      fragment on StatusContext {
        context description state targetUrl
      }
    `,
  },
});
