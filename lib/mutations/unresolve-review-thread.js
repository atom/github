import {
  commitMutation,
  graphql,
} from 'react-relay';

const mutation = graphql`
  mutation unresolveReviewThreadMutation($input: UnresolveReviewThreadInput!) {
    unresolveReviewThread(input: $input) {
      thread {
        id
        isResolved
      }
    }
  }
`;

export default (threadId, environment) => {
  const variables = {
    input: {
      threadId,
      // clientMutationId: '',
    },
  };

  const optimisticResponse = {
    unresolveReviewThread: {
      thread: {
        id: threadId,
        isResolved: false,
      },
    },
  };

  console.log('@@@@@@@@@@', optimisticResponse);

  commitMutation(
    environment,
    {
      mutation,
      variables,
      // optimisticResponse,
    },
  );
};
