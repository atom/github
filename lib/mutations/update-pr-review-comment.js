/* istanbul ignore file */

import {commitMutation, graphql} from 'react-relay';

const mutation = graphql`
  mutation updatePrReviewCommentMutation($input: UpdatePullRequestReviewCommentInput!) {
    updatePullRequestReviewComment(input: $input) {
      pullRequestReviewComment {
        id
        body
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
  //
  // function optimisticUpdater(store) {
  //   const subject = store.get(commentId);
  //   console.log(subject);
  //   // const reactionGroups = subject.getLinkedRecords('reactionGroups') || [];
  //   // const reactionGroup = reactionGroups.find(group => group.getValue('content') === content);
  //   // if (!reactionGroup) {
  //   //   return;
  //   // }
  //   //
  //   // reactionGroup.setValue(false, 'viewerHasReacted');
  //   // const conn = reactionGroup.getLinkedRecord('users');
  //   // conn.setValue(conn.getValue('totalCount') - 1, 'totalCount');
  // }

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
