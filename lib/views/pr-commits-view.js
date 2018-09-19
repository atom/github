import React from 'react';
import PropTypes from 'prop-types';
import {graphql, createPaginationContainer} from 'react-relay';
import {RelayConnectionPropType} from '../prop-types';
import PrCommitView from './pr-commit-view';

export class PrCommitsView extends React.Component {
  static propTypes = {
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
  commit: graphql`
    fragment prCommitsView_commit on PullRequest
    @argumentDefinitions(
      commitCount: {type: "Int!"},
      commitCursor: {type: "String"}
    ) {
      commits(
        first: $commitCount, after: $commitCursor
      ) @connection(key: "prCommitsView_commit") {
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
    };
  },
  query: graphql`
    query prCommitsViewQuery($commitCount: Int!, $commitCursor: String, $url: URI!) {
      resource(url: $url) {
        ... on PullRequest {
          ...prCommitsView_commit @arguments(commitCount: $commitCount, commitCursor: $commitCursor)
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
//             commit {
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
