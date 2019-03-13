import {createSpecBuilderClass, defer} from './helpers';
import {createConnectionBuilderClass} from './connection';

const PullRequestBuilder = defer('./pr', 'PullRequestBuilder');

export const RefBuilder = createSpecBuilderClass('RefBuilder', {
  prefix: {default: 'refs/heads/'},
  name: {default: 'master'},
  associatedPullRequests: {
    linked: createConnectionBuilderClass('AssociatedPullRequestsConnectionBuilder', PullRequestBuilder),
  },
});
