/* istanbul ignore file */

import {commitMutation, graphql} from 'react-relay';
import marked from 'marked';
import moment from 'moment';

const mutation = graphql`
  mutation updatePrReviewSummaryMutation($input: UpdatePullRequestReviewInput!) {
    updatePullRequestReview(input: $input) {
      pullRequestReview {
        id
        lastEditedAt
        body
        bodyHTML
      }
    }
  }
`;

export default (environment, {reviewId, reviewBody}) => {
  const variables = {
    input: {
      pullRequestReviewId: reviewId,
      body: reviewBody,
    },
  };

  const optimisticResponse = {
    updatePullRequestReview: {
      pullRequestReview: {
        id: reviewId,
        lastEditedAt: moment().toISOString(),
        body: reviewBody,
        bodyHTML: marked(reviewBody, {gfm: true}),
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
