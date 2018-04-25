import {graphql, createPaginationContainer} from 'react-relay';

import IssueishTimelineView from '../views/issueish-timeline-view';

export default createPaginationContainer(IssueishTimelineView, {
  pullRequest: graphql`
    fragment prTimelineContainer_pullRequest on PullRequest {
      url
      ...headRefForcePushedEventContainer_issueish
      timeline(
        first: $timelineCount after: $timelineCursor
      ) @connection(key: "prTimelineContainer_timeline") {
        pageInfo { endCursor hasNextPage }
        edges {
          cursor
          node {
            __typename
            ...commitsContainer_nodes
            ...issueCommentContainer_item
            ...mergedEventContainer_item
            ...headRefForcePushedEventContainer_item
            ...commitCommentThreadContainer_item
            ...crossReferencedEventsContainer_nodes
          }
        }
      }
    }
  `,
}, {
  direction: 'forward',
  getConnectionFromProps(props) {
    return props.pullRequest.timeline;
  },
  getFragmentVariables(prevVars, totalCount) {
    return {
      ...prevVars,
      timelineCount: totalCount,
    };
  },
  getVariables(props, {count, cursor}, fragmentVariables) {
    return {
      url: props.pullRequest.url,
      timelineCount: count,
      timelineCursor: cursor,
    };
  },
  query: graphql`
    query prTimelineContainerQuery($timelineCount: Int! $timelineCursor: String $url: URI!) {
      resource(url: $url) {
        ... on PullRequest {
          ...prTimelineContainer_pullRequest
        }
      }
    }
  `,
});
