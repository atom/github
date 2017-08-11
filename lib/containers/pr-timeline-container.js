import {graphql, createPaginationContainer} from 'react-relay';

import IssueishTimelineView from '../views/issueish-timeline-view';

export default createPaginationContainer(IssueishTimelineView, {
  pullRequest: graphql`
    fragment PrTimelineContainer_pullRequest on PullRequest {
      url
      ...HeadRefForcePushedEventContainer_issueish
      timeline(
        first: $timelineCount after: $timelineCursor
      ) @connection(key: "PrTimelineContainer_timeline") {
        pageInfo { endCursor hasNextPage }
        edges {
          cursor
          node {
            __typename
            ...CommitsContainer_nodes
            ...IssueCommentContainer_item
            ...MergedEventContainer_item
            ...HeadRefForcePushedEventContainer_item
            ...CommitCommentThreadContainer_item
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
    query PrTimelineContainerQuery($timelineCount: Int! $timelineCursor: String $url: URI!) {
      resource(url: $url) {
        ... on PullRequest {
          ...PrTimelineContainer_pullRequest
        }
      }
    }
  `,
});
