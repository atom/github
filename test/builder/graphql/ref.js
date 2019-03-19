import {createSpecBuilderClass, defer} from './helpers';
import {createConnectionBuilderClass} from './connection';

const PullRequestBuilder = defer('./pr', 'PullRequestBuilder');

export const RefBuilder = createSpecBuilderClass('Ref', {
  prefix: {default: 'refs/heads/'},
  name: {default: 'master'},
  associatedPullRequests: {linked: createConnectionBuilderClass('PullRequest', PullRequestBuilder)},
});
