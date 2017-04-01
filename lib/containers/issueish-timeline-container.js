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
    switchToIssueish: React.PropTypes.func.isRequired,
    issueish: React.PropTypes.shape({
      timeline: React.PropTypes.object.isRequired,
    }),
  }

  render() {
    const issueish = this.props.issueish;
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

export default Relay.createContainer(PrTimeline, {
  fragments: {
    issueish: () => Relay.QL`
      fragment on Issueish {
        ... on Timeline {
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
      }
    `,
  },
});
