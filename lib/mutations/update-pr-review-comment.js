/* istanbul ignore file */

import {commitMutation, graphql} from 'react-relay';
import marked from 'marked';
import moment from 'moment';

const mutation = graphql`
  mutation updatePrReviewCommentMutation($input: UpdatePullRequestReviewCommentInput!) {
    updatePullRequestReviewComment(input: $input) {
      pullRequestReviewComment {
        id
        lastEditedAt
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
        lastEditedAt: moment().toISOString(),
        body: commentBody,
        bodyHTML: marked(commentBody, {gfm: true}),
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
