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
        viewerCanResolve
        viewerCanUnresolve
        resolvedBy {
          login
        }
      }
    }
  }
`;

export default (threadId, environment) => {
  const variables = {
    input: {
      threadId,
    },
  };

  const optimisticResponse = {
    unresolveReviewThread: {
      thread: {
        id: threadId,
        isResolved: false,
        viewerCanResolve: true,
        viewerCanUnresolve: false,
        resolvedBy: {
          login: null,
        },
      },
    },
  };

  commitMutation(
    environment,
    {
      mutation,
      variables,
      optimisticResponse,
    },
  );
};
