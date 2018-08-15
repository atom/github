/**
 * @flow
 * @relayHash 5821e0667d3f593dc75d2c4ac34985ca
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteRequest } from 'relay-runtime';
type issueishListController_results$ref = any;
export type currentPullRequestContainerQueryVariables = {|
  headOwner: string,
  headName: string,
  headRef: string,
  first: number,
|};
export type currentPullRequestContainerQueryResponse = {|
  +repository: ?{|
    +ref: ?{|
      +associatedPullRequests: {|
        +totalCount: number,
        +nodes: ?$ReadOnlyArray<?{|
          +$fragmentRefs: issueishListController_results$ref
        |}>,
      |}
    |}
  |}
|};
export type currentPullRequestContainerQuery = {|
  variables: currentPullRequestContainerQueryVariables,
  response: currentPullRequestContainerQueryResponse,
|};
*/


/*
query currentPullRequestContainerQuery(
  $headOwner: String!
  $headName: String!
  $headRef: String!
  $first: Int!
) {
  repository(owner: $headOwner, name: $headName) {
    ref(qualifiedName: $headRef) {
      associatedPullRequests(first: $first, states: [OPEN]) {
        totalCount
        nodes {
          ...issueishListController_results
          id
        }
      }
      id
    }
    id
  }
}

fragment issueishListController_results on PullRequest {
  number
  title
  url
  author {
    __typename
    login
    avatarUrl
    ... on Node {
      id
    }
  }
  createdAt
  headRefName
  repository {
    id
  }
  commits(last: 1) {
    nodes {
      commit {
        status {
          contexts {
            state
            id
          }
          id
        }
        id
      }
      id
    }
  }
}
*/

const node/*: ConcreteRequest*/ = (function(){
var v0 = [
  {
    "kind": "LocalArgument",
    "name": "headOwner",
    "type": "String!",
    "defaultValue": null
  },
  {
    "kind": "LocalArgument",
    "name": "headName",
    "type": "String!",
    "defaultValue": null
  },
  {
    "kind": "LocalArgument",
    "name": "headRef",
    "type": "String!",
    "defaultValue": null
  },
  {
    "kind": "LocalArgument",
    "name": "first",
    "type": "Int!",
    "defaultValue": null
  }
],
v1 = [
  {
    "kind": "Variable",
    "name": "name",
    "variableName": "headName",
    "type": "String!"
  },
  {
    "kind": "Variable",
    "name": "owner",
    "variableName": "headOwner",
    "type": "String!"
  }
],
v2 = [
  {
    "kind": "Variable",
    "name": "qualifiedName",
    "variableName": "headRef",
    "type": "String!"
  }
],
v3 = [
  {
    "kind": "Variable",
    "name": "first",
    "variableName": "first",
    "type": "Int"
  },
  {
    "kind": "Literal",
    "name": "states",
    "value": [
      "OPEN"
    ],
    "type": "[PullRequestState!]"
  }
],
v4 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "totalCount",
  "args": null,
  "storageKey": null
},
v5 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "id",
  "args": null,
  "storageKey": null
};
return {
  "kind": "Request",
  "operationKind": "query",
  "name": "currentPullRequestContainerQuery",
  "id": null,
  "text": "query currentPullRequestContainerQuery(\n  $headOwner: String!\n  $headName: String!\n  $headRef: String!\n  $first: Int!\n) {\n  repository(owner: $headOwner, name: $headName) {\n    ref(qualifiedName: $headRef) {\n      associatedPullRequests(first: $first, states: [OPEN]) {\n        totalCount\n        nodes {\n          ...issueishListController_results\n          id\n        }\n      }\n      id\n    }\n    id\n  }\n}\n\nfragment issueishListController_results on PullRequest {\n  number\n  title\n  url\n  author {\n    __typename\n    login\n    avatarUrl\n    ... on Node {\n      id\n    }\n  }\n  createdAt\n  headRefName\n  repository {\n    id\n  }\n  commits(last: 1) {\n    nodes {\n      commit {\n        status {\n          contexts {\n            state\n            id\n          }\n          id\n        }\n        id\n      }\n      id\n    }\n  }\n}\n",
  "metadata": {},
  "fragment": {
    "kind": "Fragment",
    "name": "currentPullRequestContainerQuery",
    "type": "Query",
    "metadata": null,
    "argumentDefinitions": v0,
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "name": "repository",
        "storageKey": null,
        "args": v1,
        "concreteType": "Repository",
        "plural": false,
        "selections": [
          {
            "kind": "LinkedField",
            "alias": null,
            "name": "ref",
            "storageKey": null,
            "args": v2,
            "concreteType": "Ref",
            "plural": false,
            "selections": [
              {
                "kind": "LinkedField",
                "alias": null,
                "name": "associatedPullRequests",
                "storageKey": null,
                "args": v3,
                "concreteType": "PullRequestConnection",
                "plural": false,
                "selections": [
                  v4,
                  {
                    "kind": "LinkedField",
                    "alias": null,
                    "name": "nodes",
                    "storageKey": null,
                    "args": null,
                    "concreteType": "PullRequest",
                    "plural": true,
                    "selections": [
                      {
                        "kind": "FragmentSpread",
                        "name": "issueishListController_results",
                        "args": null
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
  },
  "operation": {
    "kind": "Operation",
    "name": "currentPullRequestContainerQuery",
    "argumentDefinitions": v0,
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "name": "repository",
        "storageKey": null,
        "args": v1,
        "concreteType": "Repository",
        "plural": false,
        "selections": [
          {
            "kind": "LinkedField",
            "alias": null,
            "name": "ref",
            "storageKey": null,
            "args": v2,
            "concreteType": "Ref",
            "plural": false,
            "selections": [
              {
                "kind": "LinkedField",
                "alias": null,
                "name": "associatedPullRequests",
                "storageKey": null,
                "args": v3,
                "concreteType": "PullRequestConnection",
                "plural": false,
                "selections": [
                  v4,
                  {
                    "kind": "LinkedField",
                    "alias": null,
                    "name": "nodes",
                    "storageKey": null,
                    "args": null,
                    "concreteType": "PullRequest",
                    "plural": true,
                    "selections": [
                      {
                        "kind": "ScalarField",
                        "alias": null,
                        "name": "number",
                        "args": null,
                        "storageKey": null
                      },
                      {
                        "kind": "ScalarField",
                        "alias": null,
                        "name": "title",
                        "args": null,
                        "storageKey": null
                      },
                      {
                        "kind": "ScalarField",
                        "alias": null,
                        "name": "url",
                        "args": null,
                        "storageKey": null
                      },
                      {
                        "kind": "LinkedField",
                        "alias": null,
                        "name": "author",
                        "storageKey": null,
                        "args": null,
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
                          {
                            "kind": "ScalarField",
                            "alias": null,
                            "name": "login",
                            "args": null,
                            "storageKey": null
                          },
                          {
                            "kind": "ScalarField",
                            "alias": null,
                            "name": "avatarUrl",
                            "args": null,
                            "storageKey": null
                          },
                          v5
                        ]
                      },
                      {
                        "kind": "ScalarField",
                        "alias": null,
                        "name": "createdAt",
                        "args": null,
                        "storageKey": null
                      },
                      {
                        "kind": "ScalarField",
                        "alias": null,
                        "name": "headRefName",
                        "args": null,
                        "storageKey": null
                      },
                      {
                        "kind": "LinkedField",
                        "alias": null,
                        "name": "repository",
                        "storageKey": null,
                        "args": null,
                        "concreteType": "Repository",
                        "plural": false,
                        "selections": [
                          v5
                        ]
                      },
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
                            "name": "nodes",
                            "storageKey": null,
                            "args": null,
                            "concreteType": "PullRequestCommit",
                            "plural": true,
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
                                      {
                                        "kind": "LinkedField",
                                        "alias": null,
                                        "name": "contexts",
                                        "storageKey": null,
                                        "args": null,
                                        "concreteType": "StatusContext",
                                        "plural": true,
                                        "selections": [
                                          {
                                            "kind": "ScalarField",
                                            "alias": null,
                                            "name": "state",
                                            "args": null,
                                            "storageKey": null
                                          },
                                          v5
                                        ]
                                      },
                                      v5
                                    ]
                                  },
                                  v5
                                ]
                              },
                              v5
                            ]
                          }
                        ]
                      },
                      v5
                    ]
                  }
                ]
              },
              v5
            ]
          },
          v5
        ]
      }
    ]
  }
};
})();
// prettier-ignore
(node/*: any*/).hash = 'ade50c0777277f2032b27dfced670a2d';
module.exports = node;
