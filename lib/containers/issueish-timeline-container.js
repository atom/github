import React from 'react';
import Relay from 'react-relay/classic';
import PropTypes from 'prop-types';
import {autobind} from 'core-decorators';

import Commits from './timeline-items/commits-container.js';
import IssueComment from './timeline-items/issue-comment-container.js';
import MergedEvent from './timeline-items/merged-event-container.js';
import Octicon from '../views/octicon';
import {RelayConnectionPropType} from '../prop-types';

const groupableTimelineItems = {
  Commit: Commits,
};

const nonGroupableTimelineItems = {
  IssueComment,
  MergedEvent,
};

const TimelineConnectionPropType = RelayConnectionPropType(
  PropTypes.shape({
    __typename: PropTypes.string.isRequired,
  }),
).isRequired;

export class IssueishTimeline extends React.Component {
  static propTypes = {
    switchToIssueish: PropTypes.func.isRequired,
    loadMore: PropTypes.func.isRequired,
    issue: PropTypes.shape({
      timeline: TimelineConnectionPropType,
    }),
    pullRequest: PropTypes.shape({
      timeline: TimelineConnectionPropType,
    }),
  }

  state = {
    loadingMore: false,
  }

  @autobind
  async loadMore() {
    if (this.state.loadingMore) { return; }

    this.setState({loadingMore: true});
    await this.props.loadMore();
    this.setState({loadingMore: false});
  }

  render() {
    const issueish = this.props.issue || this.props.pullRequest;
    const groupedEdges = this.groupEdges(issueish.timeline.edges);
    return (
      <div className="github-PrTimeline">
        {groupedEdges.map(({type, edges}) => {
          if (groupableTimelineItems[type]) {
            return this.renderGroupableTimelineEvents(type, edges);
          } else if (nonGroupableTimelineItems[type]) {
            return this.renderNonGroupableTimelineEvents(type, edges);
          } else {
            // eslint-disable-next-line no-console
            console.warn(`unrecogized timeline event type: ${type}`);
            return null;
          }
        })}
        {this.renderLoadMore(issueish)}
      </div>
    );
  }

  renderLoadMore(issueish) {
    if (!issueish.timeline.pageInfo.hasNextPage) {
      return null;
    }

    return (
      <div className="github-PrTimeline-load-more-link" onClick={this.loadMore}>
        {this.state.loadingMore ? <Octicon icon="ellipsis" /> : 'Load More'}
      </div>
    );
  }

  renderGroupableTimelineEvents(type, edges) {
    const Component = groupableTimelineItems[type];
    return (
      <Component
        key={`${type}-${edges[0].cursor}`}
        nodes={edges.map(e => e.node)}
        switchToIssueish={this.props.switchToIssueish}
      />
    );
  }

  renderNonGroupableTimelineEvents(type, edges) {
    const Component = nonGroupableTimelineItems[type];
    return edges.map(({node, cursor}) => {
      return <Component key={`${type}-${cursor}`} item={node} switchToIssueish={this.props.switchToIssueish} />;
    });
  }

  groupEdges(edges) {
    let currentGroup;
    const groupedEdges = [];
    let lastEdgeType;
    edges.forEach(({node, cursor}) => {
      const currentEdgeType = node.__typename;
      if (currentEdgeType === lastEdgeType) {
        currentGroup.edges.push({node, cursor});
      } else {
        currentGroup = {
          type: currentEdgeType,
          edges: [{node, cursor}],
        };
        groupedEdges.push(currentGroup);
      }
      lastEdgeType = currentEdgeType;
    });
    return groupedEdges;
  }
}

export default Relay.createContainer(IssueishTimeline, {
  initialVariables: {
    pageSize: 100,
  },

  fragments: {
    issue: () => Relay.QL`
      fragment on Issue {
        timeline(first: $pageSize) {
          pageInfo { hasNextPage }
          edges {
            cursor
            node {
              __typename
              ${groupableTimelineItems.Commit.getFragment('nodes')}
              ${nonGroupableTimelineItems.IssueComment.getFragment('item')}
            }
          }
        }
      }
    `,
    pullRequest: () => Relay.QL`
      fragment on PullRequest {
        timeline(first: $pageSize) {
          pageInfo { hasNextPage }
          edges {
            cursor
            node {
              __typename
              ${groupableTimelineItems.Commit.getFragment('nodes')}
              ${nonGroupableTimelineItems.IssueComment.getFragment('item')}
              ${nonGroupableTimelineItems.MergedEvent.getFragment('item')}
            }
          }
        }
      }
    `,
  },
});
