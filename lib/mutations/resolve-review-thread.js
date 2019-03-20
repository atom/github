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

export default (threadId, environment, completed) => {
  const variables = {
    input: {
      threadId,
      // clientMutationId: '',
    },
  };

  const optimisticResponse = {
    resolveReviewThread: {
      thread: {
        id: threadId,
        isResolved: true,
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
      optimisticUpdater: store => {
        global.store = store;
        const threadRecord = store.get(threadId);
        console.log(threadRecord.getValue('isResolved'));
        threadRecord.setValue(true, 'isResolved');
        console.log(threadRecord.getValue('isResolved'));

      },
      updater: store => {
        const threadRecord = store.get(threadId);
        console.log(threadRecord.getValue('isResolved'));
        threadRecord.setValue(true, 'isResolved');
        console.log(threadRecord.getValue('isResolved'));


      },
      onCompleted: (response, errors) => {
        if (errors) { throw errors; }
        completed(response.resolveReviewThread.thread);
        console.log('COMPLETED', response);
      },
    },
  );
};
