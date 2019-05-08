/* istanbul ignore file */

import {commitMutation, graphql} from 'react-relay';
import marked from 'marked';

const mutation = graphql`
  mutation updatePrReviewCommentMutation($input: UpdatePullRequestReviewCommentInput!) {
    updatePullRequestReviewComment(input: $input) {
      pullRequestReviewComment {
        id
        body
        bodyHTML
      }
    }
  }
`;

export default (environment, {commentId, commentBody}) => {
  const variables = {
    input: {
      pullRequestReviewCommentId: commentId,
      body: commentBody,
    },
  };

  const optimisticResponse = {
    updatePullRequestReviewComment: {
      pullRequestReviewComment: {
        id: commentId,
        body: commentBody,
      },
    },
  };

  return new Promise((resolve, reject) => {
    commitMutation(
      environment,
      {
        mutation,
        variables,
        optimisticResponse,
        onCompleted: resolve,
        onError: reject,
      },
    );
  });
};
