import React from 'react';
import Relay from 'react-relay';

import Commits from './timeline-items/commits-container.js';
import IssueComment from './timeline-items/issue-comment-container.js';
import MergedEvent from './timeline-items/merged-event-container.js';

const groupableTimelineItems = {
  Commit: Commits,
};

const nonGroupableTimelineItems = {
  IssueComment,
  MergedEvent,
};

export class PrTimeline extends React.Component {
  static propTypes = {
    pullRequest: React.PropTypes.shape({
      timeline: React.PropTypes.object.isRequired,
    }),
  }

  render() {
    const pr = this.props.pullRequest;
    const groupedEdges = this.groupEdges(pr.timeline.edges);
    return (
      <div className="github-PrTimeline">
        {groupedEdges.map(({type, edges}) => {
          if (groupableTimelineItems[type]) {
            return this.renderGroupableTimelineEvents(type, edges);
          } else if (nonGroupableTimelineItems[type]) {
            return this.renderNonGroupableTimelineEvents(type, edges);
          } else {
            throw new Error(`unrecogized timeline event type: ${type}`);
          }
        })}
      </div>
    );
  }

  renderGroupableTimelineEvents(type, edges) {
    const Component = groupableTimelineItems[type];
    return <Component nodes={edges.map(e => e.node)} />;
  }

  renderNonGroupableTimelineEvents(type, edges) {
    const Component = nonGroupableTimelineItems[type];
    return edges.map(({node, cursor}) => {
      return <Component key={cursor} item={node} />;
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

export default Relay.createContainer(PrTimeline, {
  fragments: {
    pullRequest: () => Relay.QL`
      fragment on PullRequest {
        timeline(first: 100) {
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
