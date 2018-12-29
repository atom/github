/**
 * @flow
 * @relayHash a2fda52ce9272b72cf214c6bcd70719a
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteRequest } from 'relay-runtime';
type prReviewsContainer_pullRequest$ref = any;
export type prReviewsContainerQueryVariables = {|
  reviewCount: number,
  reviewCursor?: ?string,
  commentCount: number,
  commentCursor?: ?string,
  url: any,
|};
export type prReviewsContainerQueryResponse = {|
  +resource: ?{|
    +$fragmentRefs: prReviewsContainer_pullRequest$ref
  |}
|};
export type prReviewsContainerQuery = {|
  variables: prReviewsContainerQueryVariables,
  response: prReviewsContainerQueryResponse,
|};
*/


/*
query prReviewsContainerQuery(
  $reviewCount: Int!
  $reviewCursor: String
  $commentCount: Int!
  $commentCursor: String
  $url: URI!
) {
  resource(url: $url) {
    __typename
    ... on PullRequest {
      ...prReviewsContainer_pullRequest_y4qc0
    }
    ... on Node {
      id
    }
  }
}

fragment prReviewsContainer_pullRequest_y4qc0 on PullRequest {
  url
  reviews(first: $reviewCount, after: $reviewCursor) {
    pageInfo {
      hasNextPage
      endCursor
    }
    edges {
      cursor
      node {
        id
        body
        commitId: commit {
          oid
          id
        }
        state
        submittedAt
        login: author {
          __typename
          login
          ... on Node {
            id
          }
        }
        author {
          __typename
          avatarUrl
          ... on Node {
            id
          }
        }
        ...prReviewCommentsContainer_review_1VbUmL
        __typename
      }
    }
  }
}

fragment prReviewCommentsContainer_review_1VbUmL on PullRequestReview {
  id
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
    "name": "reviewCount",
    "type": "Int!",
    "defaultValue": null
  },
  {
    "kind": "LocalArgument",
    "name": "reviewCursor",
    "type": "String",
    "defaultValue": null
  },
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
    "name": "url",
    "type": "URI!",
    "defaultValue": null
  }
],
v1 = [
  {
    "kind": "Variable",
    "name": "url",
    "variableName": "url",
    "type": "URI!"
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
v4 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "url",
  "args": null,
  "storageKey": null
},
v5 = [
  {
    "kind": "Variable",
    "name": "after",
    "variableName": "reviewCursor",
    "type": "String"
  },
  {
    "kind": "Variable",
    "name": "first",
    "variableName": "reviewCount",
    "type": "Int"
  }
],
v6 = {
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
v7 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "cursor",
  "args": null,
  "storageKey": null
},
v8 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "login",
  "args": null,
  "storageKey": null
},
v9 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "avatarUrl",
  "args": null,
  "storageKey": null
},
v10 = [
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
  "operationKind": "query",
  "name": "prReviewsContainerQuery",
  "id": null,
  "text": "query prReviewsContainerQuery(\n  $reviewCount: Int!\n  $reviewCursor: String\n  $commentCount: Int!\n  $commentCursor: String\n  $url: URI!\n) {\n  resource(url: $url) {\n    __typename\n    ... on PullRequest {\n      ...prReviewsContainer_pullRequest_y4qc0\n    }\n    ... on Node {\n      id\n    }\n  }\n}\n\nfragment prReviewsContainer_pullRequest_y4qc0 on PullRequest {\n  url\n  reviews(first: $reviewCount, after: $reviewCursor) {\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    edges {\n      cursor\n      node {\n        id\n        body\n        commitId: commit {\n          oid\n          id\n        }\n        state\n        submittedAt\n        login: author {\n          __typename\n          login\n          ... on Node {\n            id\n          }\n        }\n        author {\n          __typename\n          avatarUrl\n          ... on Node {\n            id\n          }\n        }\n        ...prReviewCommentsContainer_review_1VbUmL\n        __typename\n      }\n    }\n  }\n}\n\nfragment prReviewCommentsContainer_review_1VbUmL on PullRequestReview {\n  id\n  comments(first: $commentCount, after: $commentCursor) {\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    edges {\n      cursor\n      node {\n        id\n        author {\n          __typename\n          avatarUrl\n          login\n          ... on Node {\n            id\n          }\n        }\n        bodyHTML\n        path\n        position\n        replyTo {\n          id\n        }\n        createdAt\n        url\n        __typename\n      }\n    }\n  }\n}\n",
  "metadata": {},
  "fragment": {
    "kind": "Fragment",
    "name": "prReviewsContainerQuery",
    "type": "Query",
    "metadata": null,
    "argumentDefinitions": v0,
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "name": "resource",
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
                "name": "prReviewsContainer_pullRequest",
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
                  },
                  {
                    "kind": "Variable",
                    "name": "reviewCount",
                    "variableName": "reviewCount",
                    "type": null
                  },
                  {
                    "kind": "Variable",
                    "name": "reviewCursor",
                    "variableName": "reviewCursor",
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
    "name": "prReviewsContainerQuery",
    "argumentDefinitions": v0,
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "name": "resource",
        "storageKey": null,
        "args": v1,
        "concreteType": null,
        "plural": false,
        "selections": [
          v2,
          v3,
          {
            "kind": "InlineFragment",
            "type": "PullRequest",
            "selections": [
              v4,
              {
                "kind": "LinkedField",
                "alias": null,
                "name": "reviews",
                "storageKey": null,
                "args": v5,
                "concreteType": "PullRequestReviewConnection",
                "plural": false,
                "selections": [
                  v6,
                  {
                    "kind": "LinkedField",
                    "alias": null,
                    "name": "edges",
                    "storageKey": null,
                    "args": null,
                    "concreteType": "PullRequestReviewEdge",
                    "plural": true,
                    "selections": [
                      v7,
                      {
                        "kind": "LinkedField",
                        "alias": null,
                        "name": "node",
                        "storageKey": null,
                        "args": null,
                        "concreteType": "PullRequestReview",
                        "plural": false,
                        "selections": [
                          v3,
                          {
                            "kind": "ScalarField",
                            "alias": null,
                            "name": "body",
                            "args": null,
                            "storageKey": null
                          },
                          {
                            "kind": "LinkedField",
                            "alias": "commitId",
                            "name": "commit",
                            "storageKey": null,
                            "args": null,
                            "concreteType": "Commit",
                            "plural": false,
                            "selections": [
                              {
                                "kind": "ScalarField",
                                "alias": null,
                                "name": "oid",
                                "args": null,
                                "storageKey": null
                              },
                              v3
                            ]
                          },
                          {
                            "kind": "ScalarField",
                            "alias": null,
                            "name": "state",
                            "args": null,
                            "storageKey": null
                          },
                          {
                            "kind": "ScalarField",
                            "alias": null,
                            "name": "submittedAt",
                            "args": null,
                            "storageKey": null
                          },
                          {
                            "kind": "LinkedField",
                            "alias": "login",
                            "name": "author",
                            "storageKey": null,
                            "args": null,
                            "concreteType": null,
                            "plural": false,
                            "selections": [
                              v2,
                              v8,
                              v3
                            ]
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
                              v9,
                              v3
                            ]
                          },
                          {
                            "kind": "LinkedField",
                            "alias": null,
                            "name": "comments",
                            "storageKey": null,
                            "args": v10,
                            "concreteType": "PullRequestReviewCommentConnection",
                            "plural": false,
                            "selections": [
                              v6,
                              {
                                "kind": "LinkedField",
                                "alias": null,
                                "name": "edges",
                                "storageKey": null,
                                "args": null,
                                "concreteType": "PullRequestReviewCommentEdge",
                                "plural": true,
                                "selections": [
                                  v7,
                                  {
                                    "kind": "LinkedField",
                                    "alias": null,
                                    "name": "node",
                                    "storageKey": null,
                                    "args": null,
                                    "concreteType": "PullRequestReviewComment",
                                    "plural": false,
                                    "selections": [
                                      v3,
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
                                          v9,
                                          v8,
                                          v3
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
                                      v4,
                                      v2
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
                            "args": v10,
                            "handle": "connection",
                            "key": "PrReviewCommentsContainer_comments",
                            "filters": null
                          },
                          v2
                        ]
                      }
                    ]
                  }
                ]
              },
              {
                "kind": "LinkedHandle",
                "alias": null,
                "name": "reviews",
                "args": v5,
                "handle": "connection",
                "key": "PrReviewsContainer_reviews",
                "filters": null
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
(node/*: any*/).hash = 'a84a1ddfd0a7a0667a57d94d5db110cf';
module.exports = node;
