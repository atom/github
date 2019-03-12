import {createSpecBuilderClass} from './helpers';

const PageInfoBuilder = createSpecBuilderClass('PageInfo', {
  hasNextPage: {default: false},
  endCursor: {default: null, nullable: true},
});

export function createConnectionBuilderClass(name, NodeBuilder) {
  const EdgeBuilder = createSpecBuilderClass('Edge', {
    cursor: {default: 'zzz'},
    node: {linked: NodeBuilder},
  });

  return createSpecBuilderClass(name, {
    pageInfo: {linked: PageInfoBuilder},
    edges: {linked: EdgeBuilder, plural: true, singularName: 'edge'},
    totalCount: {default: f => f.edges.length},
  });
}
