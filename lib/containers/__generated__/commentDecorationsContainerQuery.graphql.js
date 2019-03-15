/**
 * @flow
 * @relayHash 685f1d4d54cfce06d20c77598645839c
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteRequest } from 'relay-runtime';
type commentDecorationsController_results$ref = any;
export type commentDecorationsContainerQueryVariables = {|
  headOwner: string,
  headName: string,
  headRef: string,
  first: number,
|};
export type commentDecorationsContainerQueryResponse = {|
  +repository: ?{|
    +ref: ?{|
      +associatedPullRequests: {|
        +totalCount: number,
        +nodes: ?$ReadOnlyArray<?{|
          +$fragmentRefs: commentDecorationsController_results$ref
        |}>,
      |}
    |}
  |}
|};
export type commentDecorationsContainerQuery = {|
  variables: commentDecorationsContainerQueryVariables,
  response: commentDecorationsContainerQueryResponse,
|};
*/


/*
query commentDecorationsContainerQuery(
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
          ...commentDecorationsController_results
          id
        }
      }
      id
    }
    id
  }
}

fragment commentDecorationsController_results on PullRequest {
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
  headRepository {
    name
    owner {
      __typename
      login
      id
    }
    id
  }
  repository {
    id
    owner {
      __typename
      login
      id
    }
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
  "name": "__typename",
  "args": null,
  "storageKey": null
},
v6 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "login",
  "args": null,
  "storageKey": null
},
v7 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "id",
  "args": null,
  "storageKey": null
},
v8 = {
  "kind": "LinkedField",
  "alias": null,
  "name": "owner",
  "storageKey": null,
  "args": null,
  "concreteType": null,
  "plural": false,
  "selections": [
    (v5/*: any*/),
    (v6/*: any*/),
    (v7/*: any*/)
  ]
};
return {
  "kind": "Request",
  "fragment": {
    "kind": "Fragment",
    "name": "commentDecorationsContainerQuery",
    "type": "Query",
    "metadata": null,
    "argumentDefinitions": (v0/*: any*/),
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "name": "repository",
        "storageKey": null,
        "args": (v1/*: any*/),
        "concreteType": "Repository",
        "plural": false,
        "selections": [
          {
            "kind": "LinkedField",
            "alias": null,
            "name": "ref",
            "storageKey": null,
            "args": (v2/*: any*/),
            "concreteType": "Ref",
            "plural": false,
            "selections": [
              {
                "kind": "LinkedField",
                "alias": null,
                "name": "associatedPullRequests",
                "storageKey": null,
                "args": (v3/*: any*/),
                "concreteType": "PullRequestConnection",
                "plural": false,
                "selections": [
                  (v4/*: any*/),
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
                        "name": "commentDecorationsController_results",
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
    "name": "commentDecorationsContainerQuery",
    "argumentDefinitions": (v0/*: any*/),
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "name": "repository",
        "storageKey": null,
        "args": (v1/*: any*/),
        "concreteType": "Repository",
        "plural": false,
        "selections": [
          {
            "kind": "LinkedField",
            "alias": null,
            "name": "ref",
            "storageKey": null,
            "args": (v2/*: any*/),
            "concreteType": "Ref",
            "plural": false,
            "selections": [
              {
                "kind": "LinkedField",
                "alias": null,
                "name": "associatedPullRequests",
                "storageKey": null,
                "args": (v3/*: any*/),
                "concreteType": "PullRequestConnection",
                "plural": false,
                "selections": [
                  (v4/*: any*/),
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
                          (v5/*: any*/),
                          (v6/*: any*/),
                          {
                            "kind": "ScalarField",
                            "alias": null,
                            "name": "avatarUrl",
                            "args": null,
                            "storageKey": null
                          },
                          (v7/*: any*/)
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
                        "name": "headRepository",
                        "storageKey": null,
                        "args": null,
                        "concreteType": "Repository",
                        "plural": false,
                        "selections": [
                          {
                            "kind": "ScalarField",
                            "alias": null,
                            "name": "name",
                            "args": null,
                            "storageKey": null
                          },
                          (v8/*: any*/),
                          (v7/*: any*/)
                        ]
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
                          (v7/*: any*/),
                          (v8/*: any*/)
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
                                          (v7/*: any*/)
                                        ]
                                      },
                                      (v7/*: any*/)
                                    ]
                                  },
                                  (v7/*: any*/)
                                ]
                              },
                              (v7/*: any*/)
                            ]
                          }
                        ]
                      },
                      (v7/*: any*/)
                    ]
                  }
                ]
              },
              (v7/*: any*/)
            ]
          },
          (v7/*: any*/)
        ]
      }
    ]
  },
  "params": {
    "operationKind": "query",
    "name": "commentDecorationsContainerQuery",
    "id": null,
    "text": "query commentDecorationsContainerQuery(\n  $headOwner: String!\n  $headName: String!\n  $headRef: String!\n  $first: Int!\n) {\n  repository(owner: $headOwner, name: $headName) {\n    ref(qualifiedName: $headRef) {\n      associatedPullRequests(first: $first, states: [OPEN]) {\n        totalCount\n        nodes {\n          ...commentDecorationsController_results\n          id\n        }\n      }\n      id\n    }\n    id\n  }\n}\n\nfragment commentDecorationsController_results on PullRequest {\n  number\n  title\n  url\n  author {\n    __typename\n    login\n    avatarUrl\n    ... on Node {\n      id\n    }\n  }\n  createdAt\n  headRefName\n  headRepository {\n    name\n    owner {\n      __typename\n      login\n      id\n    }\n    id\n  }\n  repository {\n    id\n    owner {\n      __typename\n      login\n      id\n    }\n  }\n  commits(last: 1) {\n    nodes {\n      commit {\n        status {\n          contexts {\n            state\n            id\n          }\n          id\n        }\n        id\n      }\n      id\n    }\n  }\n}\n",
    "metadata": {}
  }
};
})();
// prettier-ignore
(node/*: any*/).hash = '1e4f215bb79645901ab149bad30b428d';
module.exports = node;
