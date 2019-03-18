import {createSpecBuilderClass} from './helpers';

import {RepositoryBuilder} from './repository';
import {UserBuilder} from './user';
import {createConnectionBuilderClass, ConnectionCountBuilder} from './connection';
import {nextID} from '../id-sequence';

export const ReactionGroupBuilder = createSpecBuilderClass('ReactionGroup', {
  content: {default: 'ROCKET'},
  users: {linked: createConnectionBuilderClass('ReactingUserConnectionBuilder', UserBuilder)},
});

export const CommentBuilder = createSpecBuilderClass('PullRequestReviewCommentBuilder', {
  __typename: {default: 'PullRequestReviewComment'},
  id: {default: nextID},
  path: {default: 'first.txt'},
  position: {default: 0, nullable: true},
  author: {linked: UserBuilder},
  reactionGroups: {linked: ReactionGroupBuilder, plural: true, singularName: 'reactionGroup'},
  url: {default: 'https://github.com/atom/github/pull/1829/files#r242224689'},
  createdAt: {default: '2018-12-27T17:51:17Z'},
  bodyHTML: {default: 'Lorem ipsum dolor sit amet, te urbanitas appellantur est.'},
  replyTo: {default: null, nullable: true},
  isMinimized: {default: false},
  minimizedReason: {default: null, nullable: true},
  viewerCanReact: {default: true},
  viewerCanMinimize: {default: true},
});

export const CommentConnectionBuilder = createConnectionBuilderClass('PullRequestReviewCommentConnectionBuilder', CommentBuilder);

export const ReviewThreadBuilder = createSpecBuilderClass('ReviewThreadBuilder', {
  __typename: {default: 'PullRequestReviewThread'},
  id: {default: nextID},
  isResolved: {default: false},
  viewerCanResolve: {default: f => !f.isResolved},
  viewerCanUnresolve: {default: f => !!f.isResolved},
  comments: {linked: CommentConnectionBuilder},
});

export const ReviewBuilder = createSpecBuilderClass('PullRequestReviewBuilder', {
  __typename: {default: 'PullRequestReview'},
  id: {default: nextID},
  submittedAt: {default: '2018-12-28T20:40:55Z'},
  bodyHTML: {default: 'Lorem <b>ipsum</b> dolor sit amet, consectetur adipisicing elit'},
  state: {default: 'COMMENTED'},
  author: {linked: UserBuilder},
  comments: {linked: CommentConnectionBuilder},
  reactionGroups: {linked: ReactionGroupBuilder, plural: true, singularName: 'reactionGroup'},
});

export const PullRequestBuilder = createSpecBuilderClass('PullRequestBuilder', {
  id: {default: nextID},
  __typename: {default: 'PullRequest'},
  number: {default: 123},
  title: {default: 'the title'},
  baseRefName: {default: 'base-ref'},
  headRefName: {default: 'head-ref'},
  isCrossRepository: {default: false},
  changedFiles: {default: 5},
  state: {default: 'OPEN'},
  bodyHTML: {default: '', nullable: true},
  countedCommits: {linked: ConnectionCountBuilder},
  url: {default: f => {
    const ownerLogin = (f.repository && f.repository.owner && f.repository.owner.login) || 'aaa';
    const repoName = (f.repository && f.repository.name) || 'bbb';
    const number = f.number || 1;
    return `https://github.com/${ownerLogin}/${repoName}/pull/${number}`;
  }},
  author: {linked: UserBuilder},
  repository: {linked: RepositoryBuilder},
  headRepository: {linked: RepositoryBuilder, nullable: true},
  reviews: {linked: createConnectionBuilderClass('ReviewConnection', ReviewBuilder)},
  reviewThreads: {linked: createConnectionBuilderClass('ReviewThreadConnection', ReviewThreadBuilder)},
  reactionGroups: {linked: ReactionGroupBuilder, plural: true, singularName: 'reactionGroup'},
});

export function reviewThreadBuilder(...nodes) {
  return new ReviewThreadBuilder(nodes);
}

export function pullRequestBuilder(...nodes) {
  return new PullRequestBuilder(nodes);
}
