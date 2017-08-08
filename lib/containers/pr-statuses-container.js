import React from 'react';
import Relay from 'react-relay/classic';
import PropTypes from 'prop-types';

import {toSentence} from '../helpers';
import PrStatusContext from './pr-status-context-container';
import Octicon from '../views/octicon';
import DonutChart from '../views/donut-chart';
import {RelayConnectionPropType} from '../prop-types';

export const stateToIconAndStyle = {
  EXPECTED: {category: 'PENDING', icon: 'primitive-dot', style: 'status-warning'},
  PENDING: {category: 'PENDING', icon: 'primitive-dot', style: 'status-warning'},
  SUCCESS: {category: 'SUCCESS', icon: 'check', style: 'status-success'},
  ERROR: {category: 'FAILURE', icon: 'alert', style: 'status-error'},
  FAILURE: {category: 'FAILURE', icon: 'x', style: 'status-error'},
};

function category(state) {
  const info = stateToIconAndStyle[state];
  if (!info) {
    throw new Error(`Unknown state ${state}`);
  }
  return info.category;
}

class StatusDonutChart extends React.Component {
  static propTypes = {
    pending: PropTypes.number,
    failed: PropTypes.number,
    succeeded: PropTypes.number,
  }

  render() {
    const {pending, failed, succeeded, ...others} = this.props; // eslint-disable-line no-unused-vars
    const slices = ['pending', 'failed', 'succeeded'].reduce((acc, type) => {
      const count = this.props[type];
      if (count > 0) {
        acc.push({type, className: type, count});
      }
      return acc;
    }, []);

    return <DonutChart {...others} slices={slices} />;
  }
}

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
            }),
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
    if (!headCommit.status) { return null; }
    const {state, contexts} = headCommit.status;

    if (this.props.displayType === 'check') {
      const {icon, style} = stateToIconAndStyle[state];
      return <Octicon icon={icon} className={style} />;
    } else if (this.props.displayType === 'full') {
      return (
        <div className="github-PrStatuses">
          <div className="github-PrStatuses-header">
            <div className="github-PrStatuses-donut-chart">
              {this.renderDonutChart(headCommit.status)}
            </div>
            <div className="github-PrStatuses-summary">
              {this.summarySentence(headCommit.status)}
            </div>
          </div>
          <ul className="github-PrStatuses-list">
            {contexts.map(context => <PrStatusContext key={context.id} context={context} />)}
          </ul>
        </div>
      );
    } else {
      throw new Error('Invalid `displayType` prop value');
    }
  }

  renderDonutChart(status) {
    const {contexts} = status;
    const pendingLen = contexts.filter(c => category(c.state) === 'PENDING').length;
    const failedLen = contexts.filter(c => category(c.state) === 'FAILURE').length;
    const succeededLen = contexts.filter(c => category(c.state) === 'SUCCESS').length;

    return (
      <StatusDonutChart
        pending={pendingLen}
        failed={failedLen}
        succeeded={succeededLen}
      />
    );
  }

  summarySentence(status) {
    if (this.isAllSucceeded(status)) {
      return 'All checks succeeded';
    } else if (this.isAllFailed(status)) {
      return 'All checks failed';
    } else {
      const {contexts} = status;
      const noun = contexts.length === 1 ? 'check' : 'checks';
      const parts = [];
      const pending = contexts.filter(c => category(c.state) === 'PENDING');
      const failing = contexts.filter(c => category(c.state) === 'FAILURE');
      const succeeded = contexts.filter(c => category(c.state) === 'SUCCESS');
      if (pending.length) {
        parts.push(`${pending.length} pending`);
      }
      if (failing.length) {
        parts.push(`${failing.length} failing`);
      }
      if (succeeded.length) {
        parts.push(`${succeeded.length} successful`);
      }
      return toSentence(parts) + ` ${noun}`;
    }
  }

  isAllSucceeded(status) {
    return category(status.state) === 'SUCCESS';
  }

  isAllFailed(status) {
    return status.contexts.every(c => category(c.state) === 'FAILURE');
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
                    state
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
