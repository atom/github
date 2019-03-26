import {commitMutation, graphql} from 'react-relay';
import {ConnectionHandler} from 'relay-runtime';
import moment from 'moment';

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

let placeholderID = 0;

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

  function optimisticUpdater(store) {
    const reviewThread = store.get(threadID);
    if (!reviewThread) {
      return;
    }

    const id = `add-pr-review-comment:comment:${placeholderID++}`;
    const comment = store.create(id, 'PullRequestReviewComment');
    comment.setValue(id, 'id');
    comment.setValue(`<em>${body}</em>`, 'bodyHTML');
    comment.setValue(false, 'isMinimized');
    comment.setValue(false, 'viewerCanMinimize');
    comment.setValue(false, 'viewerCanReact');
    comment.setValue(moment().toISOString(), 'createdAt');
    comment.setValue('https://github.com', 'url');
    comment.setLinkedRecords([], 'reactionGroups');

    const author = store.create(`add-pr-review-comment:author:${placeholderID++}`, 'User');
    author.setValue('...', 'login');
    author.setValue('atom://github/img/avatar.svg', 'avatarUrl');
    comment.setLinkedRecord(author, 'author');

    const comments = ConnectionHandler.getConnection(reviewThread, 'ReviewCommentsAccumulator_comments');
    const edge = ConnectionHandler.createEdge(store, comments, comment, 'PullRequestReviewCommentEdge');
    ConnectionHandler.insertEdgeAfter(comments, edge);
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
