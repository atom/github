/**
 * @flow
 * @relayHash 036cb76944c0d36539a7786dfab07644
 */

/* eslint-disable */

'use strict';

/*::
import type {ConcreteBatch} from 'relay-runtime';
export type PrStatusesContainerRefetchQueryResponse = {|
  +node: ?{| |};
|};
*/


/*
query PrStatusesContainerRefetchQuery(
  $id: ID!
) {
  node(id: $id) {
    __typename
    ... on PullRequest {
      ...PrStatusesContainer_pullRequest
    }
    id
  }
}

fragment PrStatusesContainer_pullRequest on PullRequest {
  id
  commits(last: 1) {
    edges {
      node {
        commit {
          status {
            state
            contexts {
              id
              state
              ...PrStatusContextContainer_context
            }
            id
          }
          id
        }
        id
      }
    }
  }
}

fragment PrStatusContextContainer_context on StatusContext {
  context
  description
  state
  targetUrl
}
*/

const batch /*: ConcreteBatch*/ = {
  "fragment": {
    "argumentDefinitions": [
      {
        "kind": "LocalArgument",
        "name": "id",
        "type": "ID!",
        "defaultValue": null
      }
    ],
    "kind": "Fragment",
    "metadata": null,
    "name": "PrStatusesContainerRefetchQuery",
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "args": [
          {
            "kind": "Variable",
            "name": "id",
            "variableName": "id",
            "type": "ID!"
          }
        ],
        "concreteType": null,
        "name": "node",
        "plural": false,
        "selections": [
          {
            "kind": "InlineFragment",
            "type": "PullRequest",
            "selections": [
              {
                "kind": "FragmentSpread",
                "name": "PrStatusesContainer_pullRequest",
                "args": null
              }
            ]
          }
        ],
        "storageKey": null
      }
    ],
    "type": "Query"
  },
  "id": null,
  "kind": "Batch",
  "metadata": {},
  "name": "PrStatusesContainerRefetchQuery",
  "query": {
    "argumentDefinitions": [
      {
        "kind": "LocalArgument",
        "name": "id",
        "type": "ID!",
        "defaultValue": null
      }
    ],
    "kind": "Root",
    "name": "PrStatusesContainerRefetchQuery",
    "operation": "query",
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "args": [
          {
            "kind": "Variable",
            "name": "id",
            "variableName": "id",
            "type": "ID!"
          }
        ],
        "concreteType": null,
        "name": "node",
        "plural": false,
        "selections": [
          {
            "kind": "ScalarField",
            "alias": null,
            "args": null,
            "name": "__typename",
            "storageKey": null
          },
          {
            "kind": "ScalarField",
            "alias": null,
            "args": null,
            "name": "id",
            "storageKey": null
          },
          {
            "kind": "InlineFragment",
            "type": "PullRequest",
            "selections": [
              {
                "kind": "LinkedField",
                "alias": null,
                "args": [
                  {
                    "kind": "Literal",
                    "name": "last",
                    "value": 1,
                    "type": "Int"
                  }
                ],
                "concreteType": "PullRequestCommitConnection",
                "name": "commits",
                "plural": false,
                "selections": [
                  {
                    "kind": "LinkedField",
                    "alias": null,
                    "args": null,
                    "concreteType": "PullRequestCommitEdge",
                    "name": "edges",
                    "plural": true,
                    "selections": [
                      {
                        "kind": "LinkedField",
                        "alias": null,
                        "args": null,
                        "concreteType": "PullRequestCommit",
                        "name": "node",
                        "plural": false,
                        "selections": [
                          {
                            "kind": "LinkedField",
                            "alias": null,
                            "args": null,
                            "concreteType": "Commit",
                            "name": "commit",
                            "plural": false,
                            "selections": [
                              {
                                "kind": "LinkedField",
                                "alias": null,
                                "args": null,
                                "concreteType": "Status",
                                "name": "status",
                                "plural": false,
                                "selections": [
                                  {
                                    "kind": "ScalarField",
                                    "alias": null,
                                    "args": null,
                                    "name": "state",
                                    "storageKey": null
                                  },
                                  {
                                    "kind": "LinkedField",
                                    "alias": null,
                                    "args": null,
                                    "concreteType": "StatusContext",
                                    "name": "contexts",
                                    "plural": true,
                                    "selections": [
                                      {
                                        "kind": "ScalarField",
                                        "alias": null,
                                        "args": null,
                                        "name": "id",
                                        "storageKey": null
                                      },
                                      {
                                        "kind": "ScalarField",
                                        "alias": null,
                                        "args": null,
                                        "name": "state",
                                        "storageKey": null
                                      },
                                      {
                                        "kind": "InlineFragment",
                                        "type": "StatusContext",
                                        "selections": [
                                          {
                                            "kind": "ScalarField",
                                            "alias": null,
                                            "args": null,
                                            "name": "context",
                                            "storageKey": null
                                          },
                                          {
                                            "kind": "ScalarField",
                                            "alias": null,
                                            "args": null,
                                            "name": "description",
                                            "storageKey": null
                                          },
                                          {
                                            "kind": "ScalarField",
                                            "alias": null,
                                            "args": null,
                                            "name": "targetUrl",
                                            "storageKey": null
                                          }
                                        ]
                                      }
                                    ],
                                    "storageKey": null
                                  },
                                  {
                                    "kind": "ScalarField",
                                    "alias": null,
                                    "args": null,
                                    "name": "id",
                                    "storageKey": null
                                  }
                                ],
                                "storageKey": null
                              },
                              {
                                "kind": "ScalarField",
                                "alias": null,
                                "args": null,
                                "name": "id",
                                "storageKey": null
                              }
                            ],
                            "storageKey": null
                          },
                          {
                            "kind": "ScalarField",
                            "alias": null,
                            "args": null,
                            "name": "id",
                            "storageKey": null
                          }
                        ],
                        "storageKey": null
                      }
                    ],
                    "storageKey": null
                  }
                ],
                "storageKey": "commits{\"last\":1}"
              }
            ]
          }
        ],
        "storageKey": null
      }
    ]
  },
  "text": "query PrStatusesContainerRefetchQuery(\n  $id: ID!\n) {\n  node(id: $id) {\n    __typename\n    ... on PullRequest {\n      ...PrStatusesContainer_pullRequest\n    }\n    id\n  }\n}\n\nfragment PrStatusesContainer_pullRequest on PullRequest {\n  id\n  commits(last: 1) {\n    edges {\n      node {\n        commit {\n          status {\n            state\n            contexts {\n              id\n              state\n              ...PrStatusContextContainer_context\n            }\n            id\n          }\n          id\n        }\n        id\n      }\n    }\n  }\n}\n\nfragment PrStatusContextContainer_context on StatusContext {\n  context\n  description\n  state\n  targetUrl\n}\n"
};

module.exports = batch;
