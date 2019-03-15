import {createSpecBuilderClass} from './helpers';

const PageInfoBuilder = createSpecBuilderClass('PageInfo', {
  hasNextPage: {default: false},
  endCursor: {default: null, nullable: true},
});

export const ConnectionCountBuilder = createSpecBuilderClass('ConnectionCountBuilder', {
  totalCount: {default: 0},
});

export function createConnectionBuilderClass(name, NodeBuilder) {
  const EdgeBuilder = createSpecBuilderClass('Edge', {
    cursor: {default: 'zzz'},
    node: {linked: NodeBuilder},
  });

  return createSpecBuilderClass(name, {
    pageInfo: {linked: PageInfoBuilder},
    edges: {linked: EdgeBuilder, plural: true, singularName: 'edge'},
    nodes: {linked: NodeBuilder, plural: true, singularName: 'node'},
    totalCount: {default: f => {
      if (f.edges) {
        return f.edges.length;
      }
      if (f.nodes) {
        return f.nodes.length;
      }
      return 0;
    }},
  });
}
