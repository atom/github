import {createSpecBuilderClass, createConnectionBuilderClass, defer} from './base';

const PullRequestBuilder = defer('../pr', 'PullRequestBuilder');

export const RefBuilder = createSpecBuilderClass('Ref', {
  prefix: {default: 'refs/heads/'},
  name: {default: 'master'},
  associatedPullRequests: {linked: createConnectionBuilderClass('PullRequest', PullRequestBuilder)},
});
