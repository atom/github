/**
 * @flow
 * @relayHash 3f26ce1370b924d4c956fddd913a325b
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteRequest } from 'relay-runtime';
type aggregatedReviewsContainer_pullRequest$ref = any;
type prCheckoutController_pullRequest$ref = any;
export type aggregatedReviewsContainerRefetchQueryVariables = {|
  prId: string,
  reviewCount: number,
  reviewCursor?: ?string,
  threadCount: number,
  threadCursor?: ?string,
  commentCount: number,
  commentCursor?: ?string,
|};
export type aggregatedReviewsContainerRefetchQueryResponse = {|
  +pullRequest: ?{|
    +$fragmentRefs: prCheckoutController_pullRequest$ref & aggregatedReviewsContainer_pullRequest$ref
  |}
|};
export type aggregatedReviewsContainerRefetchQuery = {|
  variables: aggregatedReviewsContainerRefetchQueryVariables,
  response: aggregatedReviewsContainerRefetchQueryResponse,
|};
*/


/*
query aggregatedReviewsContainerRefetchQuery(
  $prId: ID!
  $reviewCount: Int!
  $reviewCursor: String
  $threadCount: Int!
  $threadCursor: String
  $commentCount: Int!
  $commentCursor: String
) {
  pullRequest: node(id: $prId) {
    __typename
    ...prCheckoutController_pullRequest
    ...aggregatedReviewsContainer_pullRequest_qdneZ
    id
  }
}

fragment prCheckoutController_pullRequest on PullRequest {
  number
  headRefName
  headRepository {
    name
    url
    sshUrl
    owner {
      __typename
      login
      id
    }
    id
  }
}

fragment aggregatedReviewsContainer_pullRequest_qdneZ on PullRequest {
  id
  ...reviewSummariesAccumulator_pullRequest_2zzc96
  ...reviewThreadsAccumulator_pullRequest_CKDvj
}

fragment reviewSummariesAccumulator_pullRequest_2zzc96 on PullRequest {
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
        bodyHTML
        state
        submittedAt
        author {
          __typename
          login
          avatarUrl
          ... on Node {
            id
          }
        }
        ... on Reactable {
          reactionGroups {
            content
            users {
              totalCount
            }
          }
        }
        __typename
      }
    }
  }
}

fragment reviewThreadsAccumulator_pullRequest_CKDvj on PullRequest {
  url
  reviewThreads(first: $threadCount, after: $threadCursor) {
    pageInfo {
      hasNextPage
      endCursor
    }
    edges {
      cursor
      node {
        id
        isResolved
        viewerCanResolve
        viewerCanUnresolve
        ...reviewCommentsAccumulator_reviewThread_1VbUmL
        __typename
      }
    }
  }
}

fragment reviewCommentsAccumulator_reviewThread_1VbUmL on PullRequestReviewThread {
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
        isMinimized
        minimizedReason
        viewerCanMinimize
        viewerCanReact
        path
        position
        diffHunk
        createdAt
        url
        ... on Reactable {
          reactionGroups {
            content
            users {
              totalCount
            }
          }
        }
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
    "name": "prId",
    "type": "ID!",
    "defaultValue": null
  },
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
    "name": "threadCount",
    "type": "Int!",
    "defaultValue": null
  },
  {
    "kind": "LocalArgument",
    "name": "threadCursor",
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
  }
],
v1 = [
  {
    "kind": "Variable",
    "name": "id",
    "variableName": "prId",
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
v4 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "url",
  "args": null,
  "storageKey": null
},
v5 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "login",
  "args": null,
  "storageKey": null
},
v6 = [
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
v7 = {
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
v8 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "cursor",
  "args": null,
  "storageKey": null
},
v9 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "bodyHTML",
  "args": null,
  "storageKey": null
},
v10 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "avatarUrl",
  "args": null,
  "storageKey": null
},
v11 = {
  "kind": "LinkedField",
  "alias": null,
  "name": "reactionGroups",
  "storageKey": null,
  "args": null,
  "concreteType": "ReactionGroup",
  "plural": true,
  "selections": [
    {
      "kind": "ScalarField",
      "alias": null,
      "name": "content",
      "args": null,
      "storageKey": null
    },
    {
      "kind": "LinkedField",
      "alias": null,
      "name": "users",
      "storageKey": null,
      "args": null,
      "concreteType": "ReactingUserConnection",
      "plural": false,
      "selections": [
        {
          "kind": "ScalarField",
          "alias": null,
          "name": "totalCount",
          "args": null,
          "storageKey": null
        }
      ]
    }
  ]
},
v12 = [
  {
    "kind": "Variable",
    "name": "after",
    "variableName": "threadCursor",
    "type": "String"
  },
  {
    "kind": "Variable",
    "name": "first",
    "variableName": "threadCount",
    "type": "Int"
  }
],
v13 = [
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
    "name": "aggregatedReviewsContainerRefetchQuery",
    "type": "Query",
    "metadata": null,
    "argumentDefinitions": (v0/*: any*/),
    "selections": [
      {
        "kind": "LinkedField",
        "alias": "pullRequest",
        "name": "node",
        "storageKey": null,
        "args": (v1/*: any*/),
        "concreteType": null,
        "plural": false,
        "selections": [
          {
            "kind": "FragmentSpread",
            "name": "prCheckoutController_pullRequest",
            "args": null
          },
          {
            "kind": "FragmentSpread",
            "name": "aggregatedReviewsContainer_pullRequest",
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
              },
              {
                "kind": "Variable",
                "name": "threadCount",
                "variableName": "threadCount",
                "type": null
              },
              {
                "kind": "Variable",
                "name": "threadCursor",
                "variableName": "threadCursor",
                "type": null
              }
            ]
          }
        ]
      }
    ]
  },
  "operation": {
    "kind": "Operation",
    "name": "aggregatedReviewsContainerRefetchQuery",
    "argumentDefinitions": (v0/*: any*/),
    "selections": [
      {
        "kind": "LinkedField",
        "alias": "pullRequest",
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
                  (v4/*: any*/),
                  {
                    "kind": "ScalarField",
                    "alias": null,
                    "name": "sshUrl",
                    "args": null,
                    "storageKey": null
                  },
                  {
                    "kind": "LinkedField",
                    "alias": null,
                    "name": "owner",
                    "storageKey": null,
                    "args": null,
                    "concreteType": null,
                    "plural": false,
                    "selections": [
                      (v2/*: any*/),
                      (v5/*: any*/),
                      (v3/*: any*/)
                    ]
                  },
                  (v3/*: any*/)
                ]
              },
              (v4/*: any*/),
              {
                "kind": "LinkedField",
                "alias": null,
                "name": "reviews",
                "storageKey": null,
                "args": (v6/*: any*/),
                "concreteType": "PullRequestReviewConnection",
                "plural": false,
                "selections": [
                  (v7/*: any*/),
                  {
                    "kind": "LinkedField",
                    "alias": null,
                    "name": "edges",
                    "storageKey": null,
                    "args": null,
                    "concreteType": "PullRequestReviewEdge",
                    "plural": true,
                    "selections": [
                      (v8/*: any*/),
                      {
                        "kind": "LinkedField",
                        "alias": null,
                        "name": "node",
                        "storageKey": null,
                        "args": null,
                        "concreteType": "PullRequestReview",
                        "plural": false,
                        "selections": [
                          (v3/*: any*/),
                          (v9/*: any*/),
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
                            "alias": null,
                            "name": "author",
                            "storageKey": null,
                            "args": null,
                            "concreteType": null,
                            "plural": false,
                            "selections": [
                              (v2/*: any*/),
                              (v5/*: any*/),
                              (v10/*: any*/),
                              (v3/*: any*/)
                            ]
                          },
                          (v11/*: any*/),
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
                "name": "reviews",
                "args": (v6/*: any*/),
                "handle": "connection",
                "key": "ReviewSummariesAccumulator_reviews",
                "filters": null
              },
              {
                "kind": "LinkedField",
                "alias": null,
                "name": "reviewThreads",
                "storageKey": null,
                "args": (v12/*: any*/),
                "concreteType": "PullRequestReviewThreadConnection",
                "plural": false,
                "selections": [
                  (v7/*: any*/),
                  {
                    "kind": "LinkedField",
                    "alias": null,
                    "name": "edges",
                    "storageKey": null,
                    "args": null,
                    "concreteType": "PullRequestReviewThreadEdge",
                    "plural": true,
                    "selections": [
                      (v8/*: any*/),
                      {
                        "kind": "LinkedField",
                        "alias": null,
                        "name": "node",
                        "storageKey": null,
                        "args": null,
                        "concreteType": "PullRequestReviewThread",
                        "plural": false,
                        "selections": [
                          (v3/*: any*/),
                          {
                            "kind": "ScalarField",
                            "alias": null,
                            "name": "isResolved",
                            "args": null,
                            "storageKey": null
                          },
                          {
                            "kind": "ScalarField",
                            "alias": null,
                            "name": "viewerCanResolve",
                            "args": null,
                            "storageKey": null
                          },
                          {
                            "kind": "ScalarField",
                            "alias": null,
                            "name": "viewerCanUnresolve",
                            "args": null,
                            "storageKey": null
                          },
                          {
                            "kind": "LinkedField",
                            "alias": null,
                            "name": "comments",
                            "storageKey": null,
                            "args": (v13/*: any*/),
                            "concreteType": "PullRequestReviewCommentConnection",
                            "plural": false,
                            "selections": [
                              (v7/*: any*/),
                              {
                                "kind": "LinkedField",
                                "alias": null,
                                "name": "edges",
                                "storageKey": null,
                                "args": null,
                                "concreteType": "PullRequestReviewCommentEdge",
                                "plural": true,
                                "selections": [
                                  (v8/*: any*/),
                                  {
                                    "kind": "LinkedField",
                                    "alias": null,
                                    "name": "node",
                                    "storageKey": null,
                                    "args": null,
                                    "concreteType": "PullRequestReviewComment",
                                    "plural": false,
                                    "selections": [
                                      {
                                        "kind": "ScalarField",
                                        "alias": null,
                                        "name": "path",
                                        "args": null,
                                        "storageKey": null
                                      },
                                      (v3/*: any*/),
                                      (v9/*: any*/),
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
                                        "name": "minimizedReason",
                                        "args": null,
                                        "storageKey": null
                                      },
                                      {
                                        "kind": "ScalarField",
                                        "alias": null,
                                        "name": "viewerCanMinimize",
                                        "args": null,
                                        "storageKey": null
                                      },
                                      {
                                        "kind": "ScalarField",
                                        "alias": null,
                                        "name": "viewerCanReact",
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
                                          (v2/*: any*/),
                                          (v10/*: any*/),
                                          (v5/*: any*/),
                                          (v3/*: any*/)
                                        ]
                                      },
                                      {
                                        "kind": "ScalarField",
                                        "alias": null,
                                        "name": "position",
                                        "args": null,
                                        "storageKey": null
                                      },
                                      {
                                        "kind": "ScalarField",
                                        "alias": null,
                                        "name": "diffHunk",
                                        "args": null,
                                        "storageKey": null
                                      },
                                      {
                                        "kind": "ScalarField",
                                        "alias": null,
                                        "name": "createdAt",
                                        "args": null,
                                        "storageKey": null
                                      },
                                      (v4/*: any*/),
                                      (v11/*: any*/),
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
                            "args": (v13/*: any*/),
                            "handle": "connection",
                            "key": "ReviewCommentsAccumulator_comments",
                            "filters": null
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
                "name": "reviewThreads",
                "args": (v12/*: any*/),
                "handle": "connection",
                "key": "ReviewThreadsAccumulator_reviewThreads",
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
    "name": "aggregatedReviewsContainerRefetchQuery",
    "id": null,
    "text": "query aggregatedReviewsContainerRefetchQuery(\n  $prId: ID!\n  $reviewCount: Int!\n  $reviewCursor: String\n  $threadCount: Int!\n  $threadCursor: String\n  $commentCount: Int!\n  $commentCursor: String\n) {\n  pullRequest: node(id: $prId) {\n    __typename\n    ...prCheckoutController_pullRequest\n    ...aggregatedReviewsContainer_pullRequest_qdneZ\n    id\n  }\n}\n\nfragment prCheckoutController_pullRequest on PullRequest {\n  number\n  headRefName\n  headRepository {\n    name\n    url\n    sshUrl\n    owner {\n      __typename\n      login\n      id\n    }\n    id\n  }\n}\n\nfragment aggregatedReviewsContainer_pullRequest_qdneZ on PullRequest {\n  id\n  ...reviewSummariesAccumulator_pullRequest_2zzc96\n  ...reviewThreadsAccumulator_pullRequest_CKDvj\n}\n\nfragment reviewSummariesAccumulator_pullRequest_2zzc96 on PullRequest {\n  url\n  reviews(first: $reviewCount, after: $reviewCursor) {\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    edges {\n      cursor\n      node {\n        id\n        bodyHTML\n        state\n        submittedAt\n        author {\n          __typename\n          login\n          avatarUrl\n          ... on Node {\n            id\n          }\n        }\n        ... on Reactable {\n          reactionGroups {\n            content\n            users {\n              totalCount\n            }\n          }\n        }\n        __typename\n      }\n    }\n  }\n}\n\nfragment reviewThreadsAccumulator_pullRequest_CKDvj on PullRequest {\n  url\n  reviewThreads(first: $threadCount, after: $threadCursor) {\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    edges {\n      cursor\n      node {\n        id\n        isResolved\n        viewerCanResolve\n        viewerCanUnresolve\n        ...reviewCommentsAccumulator_reviewThread_1VbUmL\n        __typename\n      }\n    }\n  }\n}\n\nfragment reviewCommentsAccumulator_reviewThread_1VbUmL on PullRequestReviewThread {\n  id\n  comments(first: $commentCount, after: $commentCursor) {\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    edges {\n      cursor\n      node {\n        id\n        author {\n          __typename\n          avatarUrl\n          login\n          ... on Node {\n            id\n          }\n        }\n        bodyHTML\n        isMinimized\n        minimizedReason\n        viewerCanMinimize\n        viewerCanReact\n        path\n        position\n        diffHunk\n        createdAt\n        url\n        ... on Reactable {\n          reactionGroups {\n            content\n            users {\n              totalCount\n            }\n          }\n        }\n        __typename\n      }\n    }\n  }\n}\n",
    "metadata": {}
  }
};
})();
// prettier-ignore
(node/*: any*/).hash = '2bf1bb4fa69d264bcecbe81f41621908';
module.exports = node;
