import {commitMutation, graphql} from 'react-relay';

const mutation = graphql`
  mutation addReactionMutation($input: AddReactionInput!) {
    addReaction(input: $input) {
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

    reactionGroup.setValue(true, 'viewerHasReacted');
    const conn = reactionGroup.getLinkedRecord('users');
    conn.setValue(conn.getValue('totalCount') + 1, 'totalCount');
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
