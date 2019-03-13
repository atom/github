import {createSpecBuilderClass} from './helpers';

import {RepositoryBuilder} from './repository';
import {UserBuilder} from './user';
import {createConnectionBuilderClass} from './connection';

const CommentBuilder = createSpecBuilderClass('PullRequestReviewCommentBuilder', {
  __typename: {default: 'PullRequestReviewComment'},
  id: {default: 0},
  path: {default: 'first.txt'},
  position: {default: 0, nullable: true},
  author: {linked: UserBuilder},
  url: {default: 'https://github.com/atom/github/pull/1829/files#r242224689'},
  createdAt: {default: '2018-12-27T17:51:17Z'},
  bodyHTML: {default: 'Lorem ipsum dolor sit amet, te urbanitas appellantur est.'},
  replyTo: {default: null, nullable: true},
  isMinimized: {default: false},
});

const CommentConnectionBuilder = createConnectionBuilderClass('PullRequestReviewCommentConnectionBuilder', CommentBuilder);

const ReviewThreadBuilder = createSpecBuilderClass('ReviewThreadBuilder', {
  __typename: {default: 'PullRequestReviewThread'},
  id: {default: 0},
  isResolved: {default: false},
  comments: {linked: CommentConnectionBuilder},
});

const ReviewBuilder = createSpecBuilderClass('PullRequestReviewBuilder', {
  __typename: {default: 'PullRequestReview'},
  id: {default: 0},
  submittedAt: {default: '2018-12-28T20:40:55Z'},
  body: {default: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit'},
  state: {default: 'COMMENTED'},
  author: {linked: UserBuilder},
  comments: {linked: CommentConnectionBuilder},
});

const PullRequestBuilder = createSpecBuilderClass('PullRequestBuilder', {
  number: {default: 123},
  headRefName: {default: 'head-ref'},
  url: {default: 'https://github.com/aaa/bbb/pull/1'},
  repository: {linked: RepositoryBuilder},
  headRepository: {linked: RepositoryBuilder, nullable: true},
  reviews: {linked: createConnectionBuilderClass('ReviewConnection', ReviewBuilder)},
  reviewThreads: {linked: createConnectionBuilderClass('ReviewThreadConnection', ReviewThreadBuilder)},
});

export function reviewThreadBuilder(...nodes) {
  return new ReviewThreadBuilder(nodes);
}

export function pullRequestBuilder(...nodes) {
  return new PullRequestBuilder(nodes);
}
