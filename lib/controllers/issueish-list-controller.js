import React from 'react';
import {graphql, createFragmentContainer} from 'react-relay';

export class IssueishListController extends React.Component {
  render() {
    return null;
  }
}

export default createFragmentContainer(IssueishListController, {
  results: graphql`
    fragment issueishListController_results on SearchResultItemConnection {
      issueCount
      nodes {
        ... on PullRequest {
          number
          title
          url
          author {
            login
            avatarUrl
          }
          createdAt
          headRefName
          headRepository {
            nameWithOwner
          }
        }
      }
    }
  `,
});
