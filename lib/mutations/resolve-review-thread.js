import {
  commitMutation,
  graphql,
} from 'react-relay';

const mutation = graphql`
  mutation resolveReviewThreadMutation($input: ResolveReviewThreadInput!) {
    resolveReviewThread(input: $input) {
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

export default (threadId, environment, onCompleted) => {
  const variables = {
    input: {
      threadId,
    },
  };

  const optimisticResponse = {
    resolveReviewThread: {
      thread: {
        id: threadId,
        isResolved: true,
        viewerCanResolve: false,
        viewerCanUnresolve: true,
        resolvedBy: {
          login: '',
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
      onCompleted,
    },
  );
};
