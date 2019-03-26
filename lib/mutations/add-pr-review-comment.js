import {commitMutation, graphql} from 'react-relay';

const mutation = graphql`
  mutation addPrReviewCommentMutation($input: AddPullRequestReviewCommentInput!) {
    addPullRequestReviewComment(input: $input) {
      commentEdge {
        node {
          id
          author {
            avatarUrl
            login
          }
          bodyHTML
          isMinimized
          minimizedReason
          viewerCanMinimize
          viewerCanReact
          path
          position
          diffHunk
          createdAt
          url
          ...emojiReactionsController_reactable
        }
      }
    }
  }
`;

export default (environment, {body, inReplyTo, reviewID, threadID}) => {
  const variables = {
    input: {
      body,
      inReplyTo,
      pullRequestReviewId: reviewID,
    },
  };

  const configs = [{
    type: 'RANGE_ADD',
    parentID: threadID,
    connectionInfo: [{key: 'ReviewCommentsAccumulator_comments', rangeBehavior: 'append'}],
    edgeName: 'commentEdge',
  }];

  return new Promise((resolve, reject) => {
    commitMutation(
      environment,
      {
        mutation,
        variables,
        configs,
        onCompleted: resolve,
        onError: reject,
      },
    );
  });
};
