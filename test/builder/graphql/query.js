import {createSpecBuilderClass} from './base';
export {getSpecRegistry} from './base';

import {RepositoryBuilder} from './repository';
import {PullRequestBuilder} from './pr';

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

const QueryBuilder = createSpecBuilderClass('QueryBuilder', {
  repository: {linked: RepositoryBuilder},
  search: {linked: SearchResultBuilder},
});

export function queryBuilder(node, specRegistry = null) {
  const options = {};

  if (specRegistry) {
    options.specRegistry = specRegistry;
  }

  return new QueryBuilder([node], options);
}
