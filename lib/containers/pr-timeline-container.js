import React from 'react';
import Relay from 'react-relay';

import Commit from './timeline-items/commit-container.js';
import IssueComment from './timeline-items/issue-comment-container.js';
import MergedEvent from './timeline-items/merged-event-container.js';

const timelineItems = {
  Commit,
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
    return (
      <div className="github-PrTimeline">
        {pr.timeline.edges.map(({node: item, cursor}) => this.renderTimelineItem(item, pr, cursor))}
      </div>
    );
  }

  renderTimelineItem(item, pr, cursor) {
    const Component = timelineItems[item.__typename];
    return Component ? <Component key={cursor} item={item} /> : null;
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
              ${timelineItems.Commit.getFragment('item')}
              ${timelineItems.IssueComment.getFragment('item')}
              ${timelineItems.MergedEvent.getFragment('item')}
            }
          }
        }
      }
    `,
  },
});
