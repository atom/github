import React from 'react';
import PropTypes from 'prop-types';
import {autobind} from 'core-decorators';

import {RelayConnectionPropType} from '../prop-types';
import Octicon from '../views/octicon';
import CommitsContainer from './../containers/timeline-items/commits-container.js';
import IssueCommentContainer from './../containers/timeline-items/issue-comment-container.js';
import MergedEventContainer from './../containers/timeline-items/merged-event-container.js';
import HeadRefForcePushedEventContainer from './../containers/timeline-items/head-ref-force-pushed-event-container.js';
import CrossReferencedEventsContainer from './../containers/timeline-items/cross-referenced-events-container.js';
import CommitCommentThreadContainer from './../containers/timeline-items/commit-comment-thread-container';

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
  Commit: CommitsContainer,
  CommitCommentThread: collectionRenderer(CommitCommentThreadContainer, false),
  IssueComment: collectionRenderer(IssueCommentContainer, false),
  MergedEvent: collectionRenderer(MergedEventContainer),
  HeadRefForcePushedEvent: collectionRenderer(HeadRefForcePushedEventContainer),
  CrossReferencedEvent: CrossReferencedEventsContainer,
};

const TimelineConnectionPropType = RelayConnectionPropType(
  PropTypes.shape({
    __typename: PropTypes.string.isRequired,
  }),
).isRequired;

export default class IssueishTimelineView extends React.Component {
  static propTypes = {
    switchToIssueish: PropTypes.func.isRequired,
    relay: PropTypes.shape({
      hasMore: PropTypes.func.isRequired,
      loadMore: PropTypes.func.isRequired,
      isLoading: PropTypes.func.isRequired,
    }).isRequired,
    issue: PropTypes.shape({
      timeline: TimelineConnectionPropType,
    }),
    pullRequest: PropTypes.shape({
      timeline: TimelineConnectionPropType,
    }),
  }

  @autobind
  loadMore() {
    this.props.relay.loadMore(10, () => {
      this.forceUpdate();
    });
    this.forceUpdate();
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
    if (!this.props.relay.hasMore()) {
      return null;
    }

    return (
      <div className="github-PrTimeline-load-more-link" onClick={this.loadMore}>
        {this.props.relay.isLoading() ? <Octicon icon="ellipsis" /> : 'Load More'}
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
