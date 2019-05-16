/* istanbul ignore file */

import {commitMutation, graphql} from 'react-relay';
import {ConnectionHandler} from 'relay-runtime';
import moment from 'moment';

import {renderMarkdown} from '../helpers';

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
          body
          bodyHTML
          isMinimized
          viewerCanReact
          viewerCanUpdate
          path
          position
          createdAt
          lastEditedAt
          url
          authorAssociation
          state
          ...emojiReactionsController_reactable

          pullRequest {
            # Assumption: this mutation is "atomic enough," so the last reviewThread in the connection is the one that
            # was just appended.
            reviewThreads(last: 1) {
              edges {
                cursor
                node {
                  id
                }
              }
            }
          }
        }
      }
    }
  }
`;

let placeholderID = 0;

export default (environment, {body, inReplyTo, reviewID, threadID, prID, viewerID, path, position, state}) => {
  const variables = {
    input: {
      pullRequestReviewId: reviewID,
      body,
      path,
      position,
      inReplyTo,
    },
  };

  function updater(store) {
    const payload = store.getRootField('addPullRequestReviewComment');
    const newCommentEdge = payload.getLinkedRecord('commentEdge');
    const newComment = newCommentEdge.getLinkedRecord('node');

    let reviewThread = store.get(threadID);
    if (!reviewThread) {
      const pullRequest = newComment.getLinkedRecord('pullRequest');
      const reviewThreads = pullRequest.getLinkedRecord('reviewThreads', {last: 1});
      const reviewThreadEdge = reviewThreads.getLinkedRecords('edges')[0];
      reviewThread = reviewThreadEdge.getLinkedRecord('node');

      const pr = store.get(prID);
      if (pr) {
        const threads = ConnectionHandler.getConnection(pr, 'ReviewThreadsAccumulator_reviewThreads');
        const prEdge = ConnectionHandler.createEdge(store, threads, reviewThread, 'PullRequestReviewThreadEdge');
        ConnectionHandler.insertEdgeAfter(threads, prEdge);
      }
    }

    let comments = ConnectionHandler.getConnection(reviewThread, 'ReviewCommentsAccumulator_comments');
    if (comments) {
      ConnectionHandler.insertEdgeAfter(comments, newCommentEdge);
    } else {
      comments = store.create(`${threadID}-reviewThreads-conn`, 'PullRequestReviewCommentConnection');

      const pageInfo = store.create(`${threadID}-reviewThreads-pageInfo`, 'PageInfo');
      pageInfo.setValue(false, 'hasNextPage');
      pageInfo.setValue(threadID, 'endCursor');
      comments.setLinkedRecord(pageInfo, 'pageInfo');

      const edge = store.create(`${threadID}-reviewThreads-edge`, 'PullRequestReviewCommentEdge');
      edge.setValue(threadID, 'cursor');
      edge.setLinkedRecord(newComment, 'node');
      comments.setLinkedRecords([edge], 'edges');

      reviewThread.setLinkedRecord(comments, 'comments');
      // This should be ConnectionHandler.setConnection() or something, but that doesn't exist.
      reviewThread.setLinkedRecord(comments, '__ReviewCommentsAccumulator_comments_connection');
    }
  }

  function optimisticUpdater(store) {
    const reviewThread = store.get(threadID);

    const id = `add-pr-review-comment:comment:${placeholderID++}`;
    const comment = store.create(id, 'PullRequestReviewComment');
    comment.setValue(id, 'id');
    comment.setValue(body, 'body');
    comment.setValue(renderMarkdown(body), 'bodyHTML');
    comment.setValue(false, 'isMinimized');
    comment.setValue(false, 'viewerCanMinimize');
    comment.setValue(false, 'viewerCanReact');
    comment.setValue(false, 'viewerCanUpdate');
    comment.setValue(moment().toISOString(), 'createdAt');
    comment.setValue(null, 'lastEditedAt');
    comment.setValue('NONE', 'authorAssociation');
    comment.setValue('https://github.com', 'url');
    comment.setValue(path, 'path');
    comment.setValue(position, 'position');
    comment.setValue(state, 'state');
    comment.setLinkedRecords([], 'reactionGroups');

    let author;
    if (viewerID) {
      author = store.get(viewerID);
    } else {
      author = store.create(`add-pr-review-comment:author:${placeholderID++}`, 'User');
      author.setValue('...', 'login');
      author.setValue('atom://github/img/avatar.svg', 'avatarUrl');
    }
    comment.setLinkedRecord(author, 'author');

    if (reviewThread) {
      const comments = ConnectionHandler.getConnection(reviewThread, 'ReviewCommentsAccumulator_comments');
      const edge = ConnectionHandler.createEdge(store, comments, comment, 'PullRequestReviewCommentEdge');
      ConnectionHandler.insertEdgeAfter(comments, edge);
    } else {
      const newReviewThread = store.create(threadID, 'PullRequestReviewThread');
      newReviewThread.setValue(threadID, 'id');
      newReviewThread.setValue(false, 'isResolved');
      newReviewThread.setValue(false, 'viewerCanResolve');
      newReviewThread.setValue(false, 'viewerCanUnresolve');

      const commentsConn = store.create(`${threadID}-reviewThreads-conn`, 'PullRequestReviewCommentConnection');

      const pageInfo = store.create(`${threadID}-reviewThreads-pageInfo`, 'PageInfo');
      pageInfo.setValue(false, 'hasNextPage');
      pageInfo.setValue(threadID, 'endCursor');
      commentsConn.setLinkedRecord(pageInfo, 'pageInfo');

      const edge = store.create(`${threadID}-reviewThreads-edge`, 'PullRequestReviewCommentEdge');
      edge.setValue(threadID, 'cursor');
      edge.setLinkedRecord(comment, 'node');
      commentsConn.setLinkedRecords([edge], 'edges');

      newReviewThread.setLinkedRecord(commentsConn, 'comments');
      // This should be ConnectionHandler.setConnection() or something, but that doesn't exist.
      newReviewThread.setLinkedRecord(commentsConn, '__ReviewCommentsAccumulator_comments_connection');

      const pr = store.get(prID);
      if (pr) {
        const threads = ConnectionHandler.getConnection(pr, 'ReviewThreadsAccumulator_reviewThreads');
        const prEdge = ConnectionHandler.createEdge(store, threads, newReviewThread, 'PullRequestReviewThreadEdge');
        ConnectionHandler.insertEdgeAfter(threads, prEdge);
      }
    }
  }

  return new Promise((resolve, reject) => {
    commitMutation(
      environment,
      {
        mutation,
        variables,
        updater,
        optimisticUpdater,
        onCompleted: resolve,
        onError: reject,
      },
    );
  });
};
