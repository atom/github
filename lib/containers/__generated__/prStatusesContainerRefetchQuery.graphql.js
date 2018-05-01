/**
 * @flow
 * @relayHash b4dcba32e85af2e67fe2eeb89782148f
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteRequest } from 'relay-runtime';
type prStatusesContainer_pullRequest$ref = any;
export type prStatusesContainerRefetchQueryVariables = {|
  id: string
|};
export type prStatusesContainerRefetchQueryResponse = {|
  +node: ?{|
    +$fragmentRefs: prStatusesContainer_pullRequest$ref
  |}
|};
*/


/*
query prStatusesContainerRefetchQuery(
  $id: ID!
) {
  node(id: $id) {
    __typename
    ... on PullRequest {
      ...prStatusesContainer_pullRequest
    }
    id
  }
}

fragment prStatusesContainer_pullRequest on PullRequest {
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
              ...prStatusContextContainer_context
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

fragment prStatusContextContainer_context on StatusContext {
  context
  description
  state
  targetUrl
}
*/

const node/*: ConcreteRequest*/ = (function(){
var v0 = [
  {
    "kind": "LocalArgument",
    "name": "id",
    "type": "ID!",
    "defaultValue": null
  }
],
v1 = [
  {
    "kind": "Variable",
    "name": "id",
    "variableName": "id",
    "type": "ID!"
  }
],
v2 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "id",
  "args": null,
  "storageKey": null
},
v3 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "state",
  "args": null,
  "storageKey": null
};
return {
  "kind": "Request",
  "operationKind": "query",
  "name": "prStatusesContainerRefetchQuery",
  "id": null,
  "text": "query prStatusesContainerRefetchQuery(\n  $id: ID!\n) {\n  node(id: $id) {\n    __typename\n    ... on PullRequest {\n      ...prStatusesContainer_pullRequest\n    }\n    id\n  }\n}\n\nfragment prStatusesContainer_pullRequest on PullRequest {\n  id\n  commits(last: 1) {\n    edges {\n      node {\n        commit {\n          status {\n            state\n            contexts {\n              id\n              state\n              ...prStatusContextContainer_context\n            }\n            id\n          }\n          id\n        }\n        id\n      }\n    }\n  }\n}\n\nfragment prStatusContextContainer_context on StatusContext {\n  context\n  description\n  state\n  targetUrl\n}\n",
  "metadata": {},
  "fragment": {
    "kind": "Fragment",
    "name": "prStatusesContainerRefetchQuery",
    "type": "Query",
    "metadata": null,
    "argumentDefinitions": v0,
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "name": "node",
        "storageKey": null,
        "args": v1,
        "concreteType": null,
        "plural": false,
        "selections": [
          {
            "kind": "InlineFragment",
            "type": "PullRequest",
            "selections": [
              {
                "kind": "FragmentSpread",
                "name": "prStatusesContainer_pullRequest",
                "args": null
              }
            ]
          }
        ]
      }
    ]
  },
  "operation": {
    "kind": "Operation",
    "name": "prStatusesContainerRefetchQuery",
    "argumentDefinitions": v0,
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "name": "node",
        "storageKey": null,
        "args": v1,
        "concreteType": null,
        "plural": false,
        "selections": [
          {
            "kind": "ScalarField",
            "alias": null,
            "name": "__typename",
            "args": null,
            "storageKey": null
          },
          v2,
          {
            "kind": "InlineFragment",
            "type": "PullRequest",
            "selections": [
              {
                "kind": "LinkedField",
                "alias": null,
                "name": "commits",
                "storageKey": "commits(last:1)",
                "args": [
                  {
                    "kind": "Literal",
                    "name": "last",
                    "value": 1,
                    "type": "Int"
                  }
                ],
                "concreteType": "PullRequestCommitConnection",
                "plural": false,
                "selections": [
                  {
                    "kind": "LinkedField",
                    "alias": null,
                    "name": "edges",
                    "storageKey": null,
                    "args": null,
                    "concreteType": "PullRequestCommitEdge",
                    "plural": true,
                    "selections": [
                      {
                        "kind": "LinkedField",
                        "alias": null,
                        "name": "node",
                        "storageKey": null,
                        "args": null,
                        "concreteType": "PullRequestCommit",
                        "plural": false,
                        "selections": [
                          {
                            "kind": "LinkedField",
                            "alias": null,
                            "name": "commit",
                            "storageKey": null,
                            "args": null,
                            "concreteType": "Commit",
                            "plural": false,
                            "selections": [
                              {
                                "kind": "LinkedField",
                                "alias": null,
                                "name": "status",
                                "storageKey": null,
                                "args": null,
                                "concreteType": "Status",
                                "plural": false,
                                "selections": [
                                  v3,
                                  {
                                    "kind": "LinkedField",
                                    "alias": null,
                                    "name": "contexts",
                                    "storageKey": null,
                                    "args": null,
                                    "concreteType": "StatusContext",
                                    "plural": true,
                                    "selections": [
                                      v2,
                                      v3,
                                      {
                                        "kind": "ScalarField",
                                        "alias": null,
                                        "name": "context",
                                        "args": null,
                                        "storageKey": null
                                      },
                                      {
                                        "kind": "ScalarField",
                                        "alias": null,
                                        "name": "description",
                                        "args": null,
                                        "storageKey": null
                                      },
                                      {
                                        "kind": "ScalarField",
                                        "alias": null,
                                        "name": "targetUrl",
                                        "args": null,
                                        "storageKey": null
                                      }
                                    ]
                                  },
                                  v2
                                ]
                              },
                              v2
                            ]
                          },
                          v2
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
};
})();
// prettier-ignore
(node/*: any*/).hash = '51243357f05d34f1acb9fccf2df72af6';
module.exports = node;
