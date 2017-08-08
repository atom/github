import React from 'react';
import Relay from 'react-relay/classic';
import PropTypes from 'prop-types';
import {autobind} from 'core-decorators';

import {RelayConnectionPropType} from '../prop-types';
import Octicon from '../views/octicon';
import Commits from './timeline-items/commits-container.js';
import IssueComment from './timeline-items/issue-comment-container.js';
import MergedEvent from './timeline-items/merged-event-container.js';
import HeadRefForcePushedEvent from './timeline-items/head-ref-force-pushed-event-container.js';
import CommitCommentThread from './timeline-items/commit-comment-thread-container';

function collectionRenderer(Component, styleAsTimelineItem = true) {
  return class GroupedComponent extends React.Component {
    static displayName = `Grouped(${Component.name})`

    static propTypes = {
      nodes: PropTypes.array.isRequired,
      issueish: PropTypes.object.isRequired,
      switchToIssueish: PropTypes.func.isRequired,
    }

    static getFragment(fragName, ...args) {
      const frag = fragName === 'nodes' ? 'item' : fragName;
      return Component.getFragment(frag, ...args);
    }

    render() {
      return <div className={styleAsTimelineItem ? 'timeline-item' : ''}>{this.props.nodes.map(this.renderNode)}</div>;
    }

    @autobind
    renderNode(node, i) {
      return (
        <Component
          key={i}
          item={node}
          issueish={this.props.issueish}
          switchToIssueish={this.props.switchToIssueish}
        />
      );
    }
  };
}

const timelineItems = {
  Commit: Commits,
  CommitCommentThread: collectionRenderer(CommitCommentThread, false),
  IssueComment: collectionRenderer(IssueComment, false),
  MergedEvent: collectionRenderer(MergedEvent),
  HeadRefForcePushedEvent: collectionRenderer(HeadRefForcePushedEvent),
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
          const Component = timelineItems[type];
          if (Component) {
            return (
              <Component
                key={`${type}-${edges[0].cursor}`}
                nodes={edges.map(e => e.node)}
                issueish={issueish}
                switchToIssueish={this.props.switchToIssueish}
              />
            );
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
              ${timelineItems.Commit.getFragment('nodes')}
              ${timelineItems.IssueComment.getFragment('nodes')}
            }
          }
        }
      }
    `,
    pullRequest: () => Relay.QL`
      fragment on PullRequest {
        ${timelineItems.HeadRefForcePushedEvent.getFragment('issueish')}
        timeline(first: $pageSize) {
          pageInfo { hasNextPage }
          edges {
            cursor
            node {
              __typename
              ${timelineItems.Commit.getFragment('nodes')}
              ${timelineItems.IssueComment.getFragment('nodes')}
              ${timelineItems.MergedEvent.getFragment('nodes')}
              ${timelineItems.HeadRefForcePushedEvent.getFragment('nodes')}
              ${timelineItems.CommitCommentThread.getFragment('nodes')}
            }
          }
        }
      }
    `,
  },
});
