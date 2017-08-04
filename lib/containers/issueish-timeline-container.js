import React from 'react';
import Relay from 'react-relay';
import PropTypes from 'prop-types';
import {autobind} from 'core-decorators';

import Commits from './timeline-items/commits-container.js';
import IssueComment from './timeline-items/issue-comment-container.js';
import MergedEvent from './timeline-items/merged-event-container.js';
import HeadRefForcePushedEvent from './timeline-items/head-ref-force-pushed-event-container.js';
import CommitCommentThread from './timeline-items/commit-comment-thread';

function collectionRenderer(Component, styleAsContainer = true) {
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
      return <div className={styleAsContainer ? 'timeline-item' : ''}>{this.props.nodes.map(this.renderNode)}</div>;
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
  IssueComment: collectionRenderer(IssueComment),
  MergedEvent: collectionRenderer(MergedEvent),
  HeadRefForcePushedEvent: collectionRenderer(HeadRefForcePushedEvent),
};

export class IssueishTimeline extends React.Component {
  static propTypes = {
    switchToIssueish: PropTypes.func.isRequired,
    issue: PropTypes.shape({
      timeline: PropTypes.object.isRequired,
    }),
    pullRequest: PropTypes.shape({
      timeline: PropTypes.object.isRequired,
    }),
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
  fragments: {
    issue: () => Relay.QL`
      fragment on Issue {
        timeline(first: 100) {
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
        timeline(first: 100) {
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
