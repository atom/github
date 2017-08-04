import React from 'react';
import Relay from 'react-relay';
import PropTypes from 'prop-types';

import PrStatusContext from './pr-status-context-container';
import {RelayConnectionPropType} from '../prop-types';

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
    if (this.props.displayType === 'check') {
      // render a check or x or dot
      return null;
    } else if (this.props.displayType === 'full') {
      const headCommit = this.props.pullRequest.commits.edges[0].node.commit;
      const {state, contexts} = headCommit.status;
      return (
        <div className="github-PrInfo-statuses">
          {state}
          <ul>
            {contexts.map(context => <PrStatusContext key={context.id} context={context} />)}
          </ul>
        </div>
      );
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
