import {commitMutation, graphql} from 'react-relay';
import {ConnectionHandler} from 'relay-runtime';

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

let placeholderID = 0;

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

  function optimisticUpdater(store) {
    const pullRequest = store.get(pullRequestID);
    if (!pullRequest) {
      return;
    }

    const id = `add-pr-review:review:${placeholderID++}`;
    const review = store.create(id, 'PullRequestReview');
    review.setValue(id, 'id');
    review.setValue('PENDING', 'state');
    review.setValue(body || '...', 'bodyHTML');
    review.setLinkedRecords([], 'reactionGroups');

    const author = store.create(`add-pr-review:author:${placeholderID++}`, 'User');
    author.setValue('...', 'login');
    author.setValue('atom://github/img/avatar.svg', 'avatarUrl');
    review.setLinkedRecord(author, 'author');

    const reviews = ConnectionHandler.getConnection(pullRequest, 'ReviewSummariesAccumulator_reviews');
    const edge = ConnectionHandler.createEdge(store, reviews, review, 'PullRequestReviewEdge');
    ConnectionHandler.insertEdgeAfter(reviews, edge);
  }

  return new Promise((resolve, reject) => {
    commitMutation(
      environment,
      {
        mutation,
        variables,
        configs,
        optimisticUpdater,
        onCompleted: resolve,
        onError: reject,
      },
    );
  });
};
