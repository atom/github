/**
 * @flow
 * @relayHash b3e3bf197fd0e0eb104928d61effc8cb
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteRequest } from 'relay-runtime';
type issueishListController_results$ref = any;
export type issueishListContainerQueryVariables = {|
  query: string
|};
export type issueishListContainerQueryResponse = {|
  +search: {|
    +$fragmentRefs: issueishListController_results$ref
  |}
|};
*/


/*
query issueishListContainerQuery(
  $query: String!
) {
  search(first: 20, query: $query, type: ISSUE) {
    ...issueishListController_results
  }
}

fragment issueishListController_results on SearchResultItemConnection {
  issueCount
  nodes {
    __typename
    ... on PullRequest {
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
        nameWithOwner
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
    ... on Node {
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
  }
],
v1 = [
  {
    "kind": "Literal",
    "name": "first",
    "value": 20,
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
  "name": "__typename",
  "args": null,
  "storageKey": null
},
v3 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "id",
  "args": null,
  "storageKey": null
};
return {
  "kind": "Request",
  "operationKind": "query",
  "name": "issueishListContainerQuery",
  "id": null,
  "text": "query issueishListContainerQuery(\n  $query: String!\n) {\n  search(first: 20, query: $query, type: ISSUE) {\n    ...issueishListController_results\n  }\n}\n\nfragment issueishListController_results on SearchResultItemConnection {\n  issueCount\n  nodes {\n    __typename\n    ... on PullRequest {\n      number\n      title\n      url\n      author {\n        __typename\n        login\n        avatarUrl\n        ... on Node {\n          id\n        }\n      }\n      createdAt\n      headRefName\n      headRepository {\n        nameWithOwner\n        id\n      }\n      commits(last: 1) {\n        nodes {\n          commit {\n            status {\n              contexts {\n                state\n                id\n              }\n              id\n            }\n            id\n          }\n          id\n        }\n      }\n    }\n    ... on Node {\n      id\n    }\n  }\n}\n",
  "metadata": {},
  "fragment": {
    "kind": "Fragment",
    "name": "issueishListContainerQuery",
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
          {
            "kind": "FragmentSpread",
            "name": "issueishListController_results",
            "args": null
          }
        ]
      }
    ]
  },
  "operation": {
    "kind": "Operation",
    "name": "issueishListContainerQuery",
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
          {
            "kind": "ScalarField",
            "alias": null,
            "name": "issueCount",
            "args": null,
            "storageKey": null
          },
          {
            "kind": "LinkedField",
            "alias": null,
            "name": "nodes",
            "storageKey": null,
            "args": null,
            "concreteType": null,
            "plural": true,
            "selections": [
              v2,
              v3,
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
                      v2,
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
                      v3
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
                        "name": "nameWithOwner",
                        "args": null,
                        "storageKey": null
                      },
                      v3
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
                                      v3
                                    ]
                                  },
                                  v3
                                ]
                              },
                              v3
                            ]
                          },
                          v3
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
(node/*: any*/).hash = 'ef13a7f2814860cf84f1c0da2d44d7ee';
module.exports = node;
