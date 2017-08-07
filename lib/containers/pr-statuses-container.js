import React from 'react';
import Relay from 'react-relay';
import PropTypes from 'prop-types';

import PrStatusContext from './pr-status-context-container';
import Octicon from '../views/octicon';
import {RelayConnectionPropType} from '../prop-types';

export const stateToIconAndStyle = {
  EXPECTED: {icon: 'primitive-dot', style: 'status-warning'},
  PENDING: {icon: 'primitive-dot', style: 'status-warning'},
  SUCCESS: {icon: 'check', style: 'status-success'},
  ERROR: {icon: 'alert', style: 'status-error'},
  FAILURE: {icon: 'x', style: 'status-error'},
};

export class PrStatuses extends React.Component {
  static propTypes = {
    displayType: PropTypes.oneOf([
      'check', 'full',
    ]),
    pullRequest: PropTypes.shape({
      commits: RelayConnectionPropType(
        PropTypes.shape({
          commit: PropTypes.shape({
            status: PropTypes.shape({
              state: PropTypes.string.isRequired,
              contexts: PropTypes.arrayOf(
                PropTypes.shape({
                  id: PropTypes.string.isRequired,
                }).isRequired,
              ).isRequired,
            }).isRequired,
          }).isRequired,
        }).isRequired,
      ).isRequired,
    }).isRequired,
  }

  static defaultProps = {
    displayType: 'full',
  }

  render() {
    const headCommit = this.props.pullRequest.commits.edges[0].node.commit;
    const {state, contexts} = headCommit.status;

    if (this.props.displayType === 'check') {
      const {icon, style} = stateToIconAndStyle[state];
      return <Octicon icon={icon} className={style} />;
    } else if (this.props.displayType === 'full') {
      return (
        <div className="github-PrInfo-statuses">
          {state}
          <ul className="github-PrInfo-statuses-list">
            {contexts.map(context => <PrStatusContext key={context.id} context={context} />)}
          </ul>
        </div>
      );
    } else {
      throw new Error('Invalid `displayType` prop value');
    }
  }
}

export default Relay.createContainer(PrStatuses, {
  fragments: {
    pullRequest: () => Relay.QL`
      fragment on PullRequest {
        commits(last:1) {
          edges {
            node {
              commit {
                status {
                  state
                  contexts {
                    id
                    ${PrStatusContext.getFragment('context')}
                  }
                }
              }
            }
          }
        }
      }
    `,
  },
});
