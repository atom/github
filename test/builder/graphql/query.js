import {createSpecBuilderClass} from './helpers';

import {RepositoryBuilder} from './repository';

const QueryBuilder = createSpecBuilderClass('QueryBuilder', {
  repository: {linked: RepositoryBuilder},
});

export function queryBuilder(...nodes) {
  return new QueryBuilder(nodes);
}
