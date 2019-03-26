import {commitMutation, graphql} from 'react-relay';

const mutation = graphql`
  mutation addPrReviewMutation($input: AddPullRequestReviewInput!) {
    addPullRequestReview(input: $input) {
      reviewEdge {
        node {
          id
          bodyHTML
          state
          submittedAt
          author {
            login
            avatarUrl
          }
          ...emojiReactionsController_reactable
        }
      }
    }
  }
`;

export default (environment, {body, event, pullRequestID}) => {
  const variables = {
    input: {
      body,
      event,
      pullRequestId: pullRequestID,
    },
  };

  const configs = [{
    type: 'RANGE_ADD',
    parentID: pullRequestID,
    connectionInfo: [{key: 'ReviewSummariesAccumulator_reviews', rangeBehavior: 'append'}],
    edgeName: 'reviewEdge',
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
