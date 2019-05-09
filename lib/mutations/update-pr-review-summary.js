/* istanbul ignore file */

import {commitMutation, graphql} from 'react-relay';
import marked from 'marked';

const mutation = graphql`
  mutation updatePrReviewSummaryMutation($input: UpdatePullRequestReviewInput!) {
    updatePullRequestReview(input: $input) {
      pullRequestReview {
        id
        body
        bodyHTML
      }
    }
  }
`;

export default (environment, {summaryId, summaryBody}) => {
  const variables = {
    input: {
      pullRequestReviewCommentId: summaryId,
      body: summaryBody,
    },
  };

  const optimisticResponse = {
    updatePullRequestReview: {
      pullRequestReview: {
        id: summaryId,
        body: summaryBody,
        bodyHTML: marked(summaryBody, {gfm: true}),
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
