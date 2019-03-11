/**
 * @flow
 * @relayHash 64864427d1bd48cdc524cbec06af166c
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteRequest } from 'relay-runtime';
type prReviewCommentsContainer_review$ref = any;
export type prReviewCommentsContainerQueryVariables = {|
  commentCount: number,
  commentCursor?: ?string,
  id: string,
|};
export type prReviewCommentsContainerQueryResponse = {|
  +node: ?{|
    +$fragmentRefs: prReviewCommentsContainer_review$ref
  |}
|};
export type prReviewCommentsContainerQuery = {|
  variables: prReviewCommentsContainerQueryVariables,
  response: prReviewCommentsContainerQueryResponse,
|};
*/


/*
query prReviewCommentsContainerQuery(
  $commentCount: Int!
  $commentCursor: String
  $id: ID!
) {
  node(id: $id) {
    __typename
    ... on PullRequestReview {
      ...prReviewCommentsContainer_review_1VbUmL
    }
    id
  }
}

fragment prReviewCommentsContainer_review_1VbUmL on PullRequestReview {
  id
  submittedAt
  comments(first: $commentCount, after: $commentCursor) {
    pageInfo {
      hasNextPage
      endCursor
    }
    edges {
      cursor
      node {
        id
        author {
          __typename
          avatarUrl
          login
          ... on Node {
            id
          }
        }
        bodyHTML
        isMinimized
        path
        position
        replyTo {
          id
        }
        createdAt
        url
        __typename
      }
    }
  }
}
*/

const node/*: ConcreteRequest*/ = (function(){
var v0 = [
  {
    "kind": "LocalArgument",
    "name": "commentCount",
    "type": "Int!",
    "defaultValue": null
  },
  {
    "kind": "LocalArgument",
    "name": "commentCursor",
    "type": "String",
    "defaultValue": null
  },
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
},
v4 = [
  {
    "kind": "Variable",
    "name": "after",
    "variableName": "commentCursor",
    "type": "String"
  },
  {
    "kind": "Variable",
    "name": "first",
    "variableName": "commentCount",
    "type": "Int"
  }
];
return {
  "kind": "Request",
  "fragment": {
    "kind": "Fragment",
    "name": "prReviewCommentsContainerQuery",
    "type": "Query",
    "metadata": null,
    "argumentDefinitions": (v0/*: any*/),
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "name": "node",
        "storageKey": null,
        "args": (v1/*: any*/),
        "concreteType": null,
        "plural": false,
        "selections": [
          {
            "kind": "InlineFragment",
            "type": "PullRequestReview",
            "selections": [
              {
                "kind": "FragmentSpread",
                "name": "prReviewCommentsContainer_review",
                "args": [
                  {
                    "kind": "Variable",
                    "name": "commentCount",
                    "variableName": "commentCount",
                    "type": null
                  },
                  {
                    "kind": "Variable",
                    "name": "commentCursor",
                    "variableName": "commentCursor",
                    "type": null
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
    "name": "prReviewCommentsContainerQuery",
    "argumentDefinitions": (v0/*: any*/),
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "name": "node",
        "storageKey": null,
        "args": (v1/*: any*/),
        "concreteType": null,
        "plural": false,
        "selections": [
          (v2/*: any*/),
          (v3/*: any*/),
          {
            "kind": "InlineFragment",
            "type": "PullRequestReview",
            "selections": [
              {
                "kind": "ScalarField",
                "alias": null,
                "name": "submittedAt",
                "args": null,
                "storageKey": null
              },
              {
                "kind": "LinkedField",
                "alias": null,
                "name": "comments",
                "storageKey": null,
                "args": (v4/*: any*/),
                "concreteType": "PullRequestReviewCommentConnection",
                "plural": false,
                "selections": [
                  {
                    "kind": "LinkedField",
                    "alias": null,
                    "name": "pageInfo",
                    "storageKey": null,
                    "args": null,
                    "concreteType": "PageInfo",
                    "plural": false,
                    "selections": [
                      {
                        "kind": "ScalarField",
                        "alias": null,
                        "name": "hasNextPage",
                        "args": null,
                        "storageKey": null
                      },
                      {
                        "kind": "ScalarField",
                        "alias": null,
                        "name": "endCursor",
                        "args": null,
                        "storageKey": null
                      }
                    ]
                  },
                  {
                    "kind": "LinkedField",
                    "alias": null,
                    "name": "edges",
                    "storageKey": null,
                    "args": null,
                    "concreteType": "PullRequestReviewCommentEdge",
                    "plural": true,
                    "selections": [
                      {
                        "kind": "ScalarField",
                        "alias": null,
                        "name": "cursor",
                        "args": null,
                        "storageKey": null
                      },
                      {
                        "kind": "LinkedField",
                        "alias": null,
                        "name": "node",
                        "storageKey": null,
                        "args": null,
                        "concreteType": "PullRequestReviewComment",
                        "plural": false,
                        "selections": [
                          (v3/*: any*/),
                          {
                            "kind": "LinkedField",
                            "alias": null,
                            "name": "author",
                            "storageKey": null,
                            "args": null,
                            "concreteType": null,
                            "plural": false,
                            "selections": [
                              (v2/*: any*/),
                              {
                                "kind": "ScalarField",
                                "alias": null,
                                "name": "avatarUrl",
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
                              (v3/*: any*/)
                            ]
                          },
                          {
                            "kind": "ScalarField",
                            "alias": null,
                            "name": "bodyHTML",
                            "args": null,
                            "storageKey": null
                          },
                          {
                            "kind": "ScalarField",
                            "alias": null,
                            "name": "isMinimized",
                            "args": null,
                            "storageKey": null
                          },
                          {
                            "kind": "ScalarField",
                            "alias": null,
                            "name": "path",
                            "args": null,
                            "storageKey": null
                          },
                          {
                            "kind": "ScalarField",
                            "alias": null,
                            "name": "position",
                            "args": null,
                            "storageKey": null
                          },
                          {
                            "kind": "LinkedField",
                            "alias": null,
                            "name": "replyTo",
                            "storageKey": null,
                            "args": null,
                            "concreteType": "PullRequestReviewComment",
                            "plural": false,
                            "selections": [
                              (v3/*: any*/)
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
                            "name": "url",
                            "args": null,
                            "storageKey": null
                          },
                          (v2/*: any*/)
                        ]
                      }
                    ]
                  }
                ]
              },
              {
                "kind": "LinkedHandle",
                "alias": null,
                "name": "comments",
                "args": (v4/*: any*/),
                "handle": "connection",
                "key": "PrReviewCommentsContainer_comments",
                "filters": null
              }
            ]
          }
        ]
      }
    ]
  },
  "params": {
    "operationKind": "query",
    "name": "prReviewCommentsContainerQuery",
    "id": null,
    "text": "query prReviewCommentsContainerQuery(\n  $commentCount: Int!\n  $commentCursor: String\n  $id: ID!\n) {\n  node(id: $id) {\n    __typename\n    ... on PullRequestReview {\n      ...prReviewCommentsContainer_review_1VbUmL\n    }\n    id\n  }\n}\n\nfragment prReviewCommentsContainer_review_1VbUmL on PullRequestReview {\n  id\n  submittedAt\n  comments(first: $commentCount, after: $commentCursor) {\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    edges {\n      cursor\n      node {\n        id\n        author {\n          __typename\n          avatarUrl\n          login\n          ... on Node {\n            id\n          }\n        }\n        bodyHTML\n        isMinimized\n        path\n        position\n        replyTo {\n          id\n        }\n        createdAt\n        url\n        __typename\n      }\n    }\n  }\n}\n",
    "metadata": {}
  }
};
})();
// prettier-ignore
(node/*: any*/).hash = 'd48507a6296f84357e94000010c34713';
module.exports = node;
