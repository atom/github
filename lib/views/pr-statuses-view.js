import React from 'react';
import {createRefetchContainer, graphql} from 'react-relay';
import PropTypes from 'prop-types';

import {toSentence, autobind} from '../helpers';
import PrStatusContextView from './pr-status-context-view';
import Octicon from '../atom/octicon';
import StatusDonutChart from './status-donut-chart';
import PeriodicRefresher from '../periodic-refresher';
import {RelayConnectionPropType} from '../prop-types';

export const stateToIconAndStyle = {
  EXPECTED: {category: 'PENDING', icon: 'primitive-dot', style: 'github-PrStatuses--warning'},
  PENDING: {category: 'PENDING', icon: 'primitive-dot', style: 'github-PrStatuses--warning'},
  SUCCESS: {category: 'SUCCESS', icon: 'check', style: 'github-PrStatuses--success'},
  ERROR: {category: 'FAILURE', icon: 'alert', style: 'github-PrStatuses--error'},
  FAILURE: {category: 'FAILURE', icon: 'x', style: 'github-PrStatuses--error'},
};

export function category(state) {
  const info = stateToIconAndStyle[state];
  if (!info) {
    throw new Error(`Unknown state ${state}`);
  }
  return info.category;
}

export class BarePrStatusesView extends React.Component {
  static propTypes = {
    relay: PropTypes.shape({
      refetch: PropTypes.func.isRequired,
    }).isRequired,
    displayType: PropTypes.oneOf([
      'check', 'full',
    ]),
    pullRequest: PropTypes.shape({
      id: PropTypes.string.isRequired,
      recentCommits: RelayConnectionPropType(
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

  static lastRefreshPerPr = new Map()
  static SUCCESS_REFRESH_TIMEOUT = 3 * 60 * 1000
  static PENDING_REFRESH_TIMEOUT = 30 * 1000
  static MINIMUM_REFRESH_INTERVAL = 15 * 1000

  constructor(props) {
    super(props);
    autobind(this, 'refresh');
  }

  componentDidMount() {
    this.refresher = new PeriodicRefresher(this.constructor, {
      interval: () => {
        if (this.isPendingResults()) {
          return this.constructor.PENDING_REFRESH_TIMEOUT;
        } else {
          return this.constructor.SUCCESS_REFRESH_TIMEOUT;
        }
      },
      getCurrentId: () => this.props.pullRequest.id,
      refresh: this.refresh,
      minimumIntervalPerId: this.constructor.MINIMUM_REFRESH_INTERVAL,
    });
    this.refresher.start();
  }

  componentWillUnmount() {
    this.refresher.destroy();
  }

  refresh() {
    this.props.relay.refetch({
      id: this.props.pullRequest.id,
    }, null, null, {force: true});
  }

  render() {
    const headCommit = this.props.pullRequest.recentCommits.edges[0].node.commit;
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
            {contexts.map(context => <PrStatusContextView key={context.id} context={context} />)}
          </ul>
        </div>
      );
    } else {
      throw new Error(`Invalid \`displayType\` prop value: ${this.props.displayType}`);
    }
  }

  isPendingResults() {
    const headCommit = this.props.pullRequest.recentCommits.edges[0].node.commit;
    if (!headCommit.status) { return false; }
    const {contexts} = headCommit.status;
    return contexts.some(c => category(c.state) === 'PENDING');
  }

  renderDonutChart(status) {
    const {contexts} = status;
    const pendingLen = contexts.filter(c => category(c.state) === 'PENDING').length;
    const failedLen = contexts.filter(c => category(c.state) === 'FAILURE').length;
    const succeededLen = contexts.filter(c => category(c.state) === 'SUCCESS').length;

    return (
      <StatusDonutChart
        pending={pendingLen}
        failure={failedLen}
        success={succeededLen}
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

export default createRefetchContainer(BarePrStatusesView, {
  pullRequest: graphql`
    fragment prStatusesView_pullRequest on PullRequest {
      id
      recentCommits: commits(last:1) {
        edges {
          node {
            commit {
              status {
                state
                contexts {
                  id
                  state
                  ...prStatusContextView_context
                }
              }
            }
          }
        }
      }
    }
  `,
}, graphql`
  query prStatusesViewRefetchQuery($id: ID!) {
    node(id: $id) {
      ... on PullRequest {
        ...prStatusesView_pullRequest
      }
    }
  }
`);
