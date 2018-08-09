/**
 * @flow
 * @relayHash 4f7294887e96b0a41dd57f0f3164f765
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteRequest } from 'relay-runtime';
type issueishListController_results$ref = any;
export type issueishSearchContainerQueryVariables = {|
  query: string,
  first: number,
|};
export type issueishSearchContainerQueryResponse = {|
  +search: {|
    +issueCount: number,
    +nodes: ?$ReadOnlyArray<?{|
      +$fragmentRefs: issueishListController_results$ref
    |}>,
  |}
|};
export type issueishSearchContainerQuery = {|
  variables: issueishSearchContainerQueryVariables,
  response: issueishSearchContainerQueryResponse,
|};
*/


/*
query issueishSearchContainerQuery(
  $query: String!
  $first: Int!
) {
  search(first: $first, query: $query, type: ISSUE) {
    issueCount
    nodes {
      __typename
      ...issueishListController_results
      ... on Node {
        id
      }
    }
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
    "name": "query",
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
    "name": "first",
    "variableName": "first",
    "type": "Int"
  },
  {
    "kind": "Variable",
    "name": "query",
    "variableName": "query",
    "type": "String!"
  },
  {
    "kind": "Literal",
    "name": "type",
    "value": "ISSUE",
    "type": "SearchType!"
  }
],
v2 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "issueCount",
  "args": null,
  "storageKey": null
},
v3 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "__typename",
  "args": null,
  "storageKey": null
},
v4 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "id",
  "args": null,
  "storageKey": null
};
return {
  "kind": "Request",
  "operationKind": "query",
  "name": "issueishSearchContainerQuery",
  "id": null,
  "text": "query issueishSearchContainerQuery(\n  $query: String!\n  $first: Int!\n) {\n  search(first: $first, query: $query, type: ISSUE) {\n    issueCount\n    nodes {\n      __typename\n      ...issueishListController_results\n      ... on Node {\n        id\n      }\n    }\n  }\n}\n\nfragment issueishListController_results on PullRequest {\n  number\n  title\n  url\n  author {\n    __typename\n    login\n    avatarUrl\n    ... on Node {\n      id\n    }\n  }\n  createdAt\n  headRefName\n  repository {\n    id\n  }\n  commits(last: 1) {\n    nodes {\n      commit {\n        status {\n          contexts {\n            state\n            id\n          }\n          id\n        }\n        id\n      }\n      id\n    }\n  }\n}\n",
  "metadata": {},
  "fragment": {
    "kind": "Fragment",
    "name": "issueishSearchContainerQuery",
    "type": "Query",
    "metadata": null,
    "argumentDefinitions": v0,
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "name": "search",
        "storageKey": null,
        "args": v1,
        "concreteType": "SearchResultItemConnection",
        "plural": false,
        "selections": [
          v2,
          {
            "kind": "LinkedField",
            "alias": null,
            "name": "nodes",
            "storageKey": null,
            "args": null,
            "concreteType": null,
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
  },
  "operation": {
    "kind": "Operation",
    "name": "issueishSearchContainerQuery",
    "argumentDefinitions": v0,
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "name": "search",
        "storageKey": null,
        "args": v1,
        "concreteType": "SearchResultItemConnection",
        "plural": false,
        "selections": [
          v2,
          {
            "kind": "LinkedField",
            "alias": null,
            "name": "nodes",
            "storageKey": null,
            "args": null,
            "concreteType": null,
            "plural": true,
            "selections": [
              v3,
              v4,
              {
                "kind": "InlineFragment",
                "type": "PullRequest",
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
                      v3,
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
                      v4
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
                      v4
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
                                      v4
                                    ]
                                  },
                                  v4
                                ]
                              },
                              v4
                            ]
                          },
                          v4
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
(node/*: any*/).hash = 'fc553ba742c51417ea1a857b96038345';
module.exports = node;
