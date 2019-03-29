import {parse, Source} from 'graphql';

import {createSpecBuilderClass} from './base';

import {RepositoryBuilder} from './repository';
import {PullRequestBuilder} from './pr';

import {
  AddPullRequestReviewPayloadBuilder,
  AddPullRequestReviewCommentPayloadBuilder,
  SubmitPullRequestReviewPayload,
  ResolveReviewThreadPayload,
  UnresolveReviewThreadPayload,
} from './mutations';

class SearchResultItemBuilder {
  static resolve() { return this; }

  constructor(...args) {
    this.args = args;
    this._value = null;
  }

  bePullRequest(block = () => {}) {
    const b = new PullRequestBuilder(...this.args);
    block(b);
    this._value = b.build();
  }

  build() {
    return this._value;
  }
}

const SearchResultBuilder = createSpecBuilderClass('SearchResultItemConnection', {
  issueCount: {default: 0},
  nodes: {linked: SearchResultItemBuilder, plural: true, singularName: 'node'},
});

const QueryBuilder = createSpecBuilderClass('Query', {
  repository: {linked: RepositoryBuilder},
  search: {linked: SearchResultBuilder},

  // Mutations
  addPullRequestReview: {linked: AddPullRequestReviewPayloadBuilder},
  addPullRequestReviewComment: {linked: AddPullRequestReviewCommentPayloadBuilder},
  submitPullRequestReview: {linked: SubmitPullRequestReviewPayload},
  resolveReviewThread: {linked: ResolveReviewThreadPayload},
  unresolveReviewThread: {linked: UnresolveReviewThreadPayload},
});

export function queryBuilder(...nodes) {
  return QueryBuilder.onFragmentQuery(nodes);
}

class RelayResponseBuilder extends QueryBuilder {
  static onOperation(op) {
    const doc = parse(new Source(op.text));
    return this.onFullQuery(doc);
  }

  constructor(...args) {
    super(...args);

    this._errors = [];
  }

  addError(string) {
    this._errors.push({message: string});
    return this;
  }

  build() {
    if (this._errors.length > 0) {
      const error = new Error('Pre-recorded GraphQL failure');
      error.errors = this._errors;
      throw error;
    }

    return {data: super.build()};
  }
}

export function relayResponseBuilder(op) {
  return RelayResponseBuilder.onOperation(op);
}
