import {createSpecBuilderClass} from './helpers';

import {RepositoryBuilder} from './repository';

const PullRequestBuilder = createSpecBuilderClass('PullRequestBuilder', {
  number: {default: 123},
  headRefName: {default: 'head-ref'},
  headRepository: {linked: RepositoryBuilder, nullable: true},
});

export function pullRequestBuilder(node) {
  return new PullRequestBuilder(node);
}
