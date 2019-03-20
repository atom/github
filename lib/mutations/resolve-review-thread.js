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
    resolveReviewThread: {
      thread: {
        isResolved: true,
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
