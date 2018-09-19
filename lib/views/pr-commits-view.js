import React from 'react';
import PropTypes from 'prop-types';
import {graphql, createPaginationContainer} from 'react-relay';
import {RelayConnectionPropType} from '../prop-types';
import PrCommitView from './pr-commit-view';

export class PrCommitsView extends React.Component {
  static propTypes = {
    relay: PropTypes.shape({
      hasMore: PropTypes.func.isRequired,
      loadMore: PropTypes.func.isRequired,
      isLoading: PropTypes.func.isRequired,
    }).isRequired,
    pullRequest: PropTypes.shape({
      commits: RelayConnectionPropType(
        PropTypes.shape({
          commit: PropTypes.shape({
            committer: PropTypes.shape({
              avatarUrl: PropTypes.string.isRequired,
              name: PropTypes.string.isRequired,
              date: PropTypes.string.isRequired,
            }),
            messageBody: PropTypes.string,
            messageHeadline: PropTypes.string.isRequired,
            abbreviatedOid: PropTypes.string.isRequired,
            url: PropTypes.string.isRequired,
          }),
        }),
      ),
    }),
  }

  render() {
    return this.props.pullRequest.commits.edges.map(edge => {
      const commit = edge.node.commit;
      return (
        <PrCommitView
          key={commit.abbreviatedOid}
          committerAvatarUrl={commit.committer.avatarUrl}
          date={commit.committer.date}
          messageBody={commit.messageBody}
          messageHeadline={commit.messageHeadline}
          abbreviatedOid={commit.abbreviatedOid}
          url={commit.url}
          committerName={commit.committer.name}
        />);
    });
  }
}

export default createPaginationContainer(PrCommitsView, {
  PullRequest: graphql`
    fragment prCommitsView_PullRequest on PullRequest
    @argumentDefinitions(
      commitCount: {type: "Int!", defaultValue: 100},
      commitCursor: {type: "String"}
    ) {
      commits(
        first: $commitCount, after: $commitCursor
      ) @connection(key: "prCommitsView_commits") {
        pageInfo { endCursor hasNextPage }
        edges {
          cursor
          node {
            commit {
              committer {
                avatarUrl
                name
                date
              }
              messageHeadline
              messageBody
              abbreviatedOid
              url
            }
          }
        }
      }
    }
  `,
}, {
  direction: 'forward',
  getConnectionFromProps(props) {
    return props.commits;
  },
  getFragmentVariables(prevVars, totalCount) {
    return {
      ...prevVars,
      commitCount: totalCount,
    };
  },
  getVariables(props, {count, cursor}, fragmentVariables) {
    return {
      commitCount: count,
      commitCursor: cursor,
      pullRequestId: fragmentVariables.id
    };
  },
  query: graphql`
    query prCommitsViewQuery($commitCount: Int!, $commitCursor: String, $pullRequestId: ID!) {
        PullRequest: node(id: $pullRequestId) {
          ... on PullRequest {
            ...prCommitsView_PullRequest @arguments(commitCount: $commitCount, commitCursor: $commitCursor)
          }
      }
    }
  `,
});
//
// export default createFragmentContainer(PrCommitsView, {
//   pullRequest: graphql`
//     fragment prCommitsView_pullRequest on PullRequest {
//       commits {
//         edges {
//           node {
//             commit(last:100) {
//               committer {
//                 avatarUrl
//                 name
//                 date
//               }
//               messageHeadline
//               messageBody
//               abbreviatedOid
//               url
//             }
//           }
//         }
//       }
//     }
//   `,
// });
