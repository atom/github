import {commitMutation, graphql} from 'react-relay';

const mutation = graphql`
  mutation removeReactionMutation($input: RemoveReactionInput!) {
    removeReaction(input: $input) {
      subject {
        reactionGroups {
          content
          users {
            totalCount
          }
        }
      }
    }
  }
`;

export default (environment, subjectId, content) => {
  const variables = {
    input: {
      content,
      subjectId,
    },
  };

  function optimisticUpdater(store) {
    const subject = store.get(subjectId);
    const reactionGroups = subject.getLinkedRecords('reactionGroups') || [];
    const reactionGroup = reactionGroups.find(group => group.getValue('content') === content);
    if (!reactionGroup) {
      return;
    }

    reactionGroup.setValue('viewerHasReacted', false);
    const conn = reactionGroup.getLinkedRecord('users');
    conn.setValue('totalCount', conn.getValue('totalCount') - 1);
  }

  return new Promise((resolve, reject) => {
    commitMutation(
      environment,
      {
        mutation,
        variables,
        optimisticUpdater,
        onCompleted: resolve,
        onError: reject,
      },
    );
  });
};
