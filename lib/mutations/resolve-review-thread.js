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
      // clientMutationId: '',
    },
  };

  commitMutation(
    environment,
    {
      mutation,
      variables,
      optimisticUpdater: proxyStore => {
        // ... you'll implement this in a bit
        console.log('optimisticUpdater', proxyStore);
      },
      updater: proxyStore => {
        console.log('updater', proxyStore);
        // ... this as well
      },
      onError: err => console.error(err),
    },
  );
};
