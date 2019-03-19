/**
 * @flow
 * @relayHash 53d9b6100a9c8f2bc8e00cda0d411552
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteRequest } from 'relay-runtime';
type aggregatedReviewsContainer_pullRequest$ref = any;
type prCheckoutController_pullRequest$ref = any;
type prCheckoutController_repository$ref = any;
export type aggregatedReviewsContainerRefetchQueryVariables = {|
  repoId: string,
  prId: string,
  reviewCount: number,
  reviewCursor?: ?string,
  threadCount: number,
  threadCursor?: ?string,
  commentCount: number,
  commentCursor?: ?string,
|};
export type aggregatedReviewsContainerRefetchQueryResponse = {|
  +repository: ?{|
    +$fragmentRefs: prCheckoutController_repository$ref
  |},
  +pullRequest: ?{|
    +$fragmentRefs: prCheckoutController_pullRequest$ref & aggregatedReviewsContainer_pullRequest$ref
  |},
|};
export type aggregatedReviewsContainerRefetchQuery = {|
  variables: aggregatedReviewsContainerRefetchQueryVariables,
  response: aggregatedReviewsContainerRefetchQueryResponse,
|};
*/


/*
query aggregatedReviewsContainerRefetchQuery(
  $repoId: ID!
  $prId: ID!
  $reviewCount: Int!
  $reviewCursor: String
  $threadCount: Int!
  $threadCursor: String
  $commentCount: Int!
  $commentCursor: String
) {
  repository: node(id: $repoId) {
    __typename
    ...prCheckoutController_repository
    id
  }
  pullRequest: node(id: $prId) {
    __typename
    ...prCheckoutController_pullRequest
    ...aggregatedReviewsContainer_pullRequest_qdneZ
    id
  }
}

fragment prCheckoutController_repository on Repository {
  name
  owner {
    __typename
    login
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
    "name": "repoId",
    "type": "ID!",
    "defaultValue": null
  },
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
    "variableName": "repoId",
    "type": "ID!"
  }
],
v2 = [
  {
    "kind": "Variable",
    "name": "id",
    "variableName": "prId",
    "type": "ID!"
  }
],
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
},
v5 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "name",
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
  "kind": "LinkedField",
  "alias": null,
  "name": "owner",
  "storageKey": null,
  "args": null,
  "concreteType": null,
  "plural": false,
  "selections": [
    (v3/*: any*/),
    (v6/*: any*/),
    (v4/*: any*/)
  ]
},
v8 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "url",
  "args": null,
  "storageKey": null
},
v9 = [
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
v10 = {
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
v11 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "cursor",
  "args": null,
  "storageKey": null
},
v12 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "bodyHTML",
  "args": null,
  "storageKey": null
},
v13 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "avatarUrl",
  "args": null,
  "storageKey": null
},
v14 = {
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
v15 = [
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
v16 = [
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
        "alias": "repository",
        "name": "node",
        "storageKey": null,
        "args": (v1/*: any*/),
        "concreteType": null,
        "plural": false,
        "selections": [
          {
            "kind": "FragmentSpread",
            "name": "prCheckoutController_repository",
            "args": null
          }
        ]
      },
      {
        "kind": "LinkedField",
        "alias": "pullRequest",
        "name": "node",
        "storageKey": null,
        "args": (v2/*: any*/),
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
        "alias": "repository",
        "name": "node",
        "storageKey": null,
        "args": (v1/*: any*/),
        "concreteType": null,
        "plural": false,
        "selections": [
          (v3/*: any*/),
          (v4/*: any*/),
          {
            "kind": "InlineFragment",
            "type": "Repository",
            "selections": [
              (v5/*: any*/),
              (v7/*: any*/)
            ]
          }
        ]
      },
      {
        "kind": "LinkedField",
        "alias": "pullRequest",
        "name": "node",
        "storageKey": null,
        "args": (v2/*: any*/),
        "concreteType": null,
        "plural": false,
        "selections": [
          (v3/*: any*/),
          (v4/*: any*/),
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
                  (v5/*: any*/),
                  (v8/*: any*/),
                  {
                    "kind": "ScalarField",
                    "alias": null,
                    "name": "sshUrl",
                    "args": null,
                    "storageKey": null
                  },
                  (v7/*: any*/),
                  (v4/*: any*/)
                ]
              },
              (v8/*: any*/),
              {
                "kind": "LinkedField",
                "alias": null,
                "name": "reviews",
                "storageKey": null,
                "args": (v9/*: any*/),
                "concreteType": "PullRequestReviewConnection",
                "plural": false,
                "selections": [
                  (v10/*: any*/),
                  {
                    "kind": "LinkedField",
                    "alias": null,
                    "name": "edges",
                    "storageKey": null,
                    "args": null,
                    "concreteType": "PullRequestReviewEdge",
                    "plural": true,
                    "selections": [
                      (v11/*: any*/),
                      {
                        "kind": "LinkedField",
                        "alias": null,
                        "name": "node",
                        "storageKey": null,
                        "args": null,
                        "concreteType": "PullRequestReview",
                        "plural": false,
                        "selections": [
                          (v4/*: any*/),
                          (v12/*: any*/),
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
                              (v3/*: any*/),
                              (v6/*: any*/),
                              (v13/*: any*/),
                              (v4/*: any*/)
                            ]
                          },
                          (v14/*: any*/),
                          (v3/*: any*/)
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
                "args": (v9/*: any*/),
                "handle": "connection",
                "key": "ReviewSummariesAccumulator_reviews",
                "filters": null
              },
              {
                "kind": "LinkedField",
                "alias": null,
                "name": "reviewThreads",
                "storageKey": null,
                "args": (v15/*: any*/),
                "concreteType": "PullRequestReviewThreadConnection",
                "plural": false,
                "selections": [
                  (v10/*: any*/),
                  {
                    "kind": "LinkedField",
                    "alias": null,
                    "name": "edges",
                    "storageKey": null,
                    "args": null,
                    "concreteType": "PullRequestReviewThreadEdge",
                    "plural": true,
                    "selections": [
                      (v11/*: any*/),
                      {
                        "kind": "LinkedField",
                        "alias": null,
                        "name": "node",
                        "storageKey": null,
                        "args": null,
                        "concreteType": "PullRequestReviewThread",
                        "plural": false,
                        "selections": [
                          (v4/*: any*/),
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
                            "args": (v16/*: any*/),
                            "concreteType": "PullRequestReviewCommentConnection",
                            "plural": false,
                            "selections": [
                              (v10/*: any*/),
                              {
                                "kind": "LinkedField",
                                "alias": null,
                                "name": "edges",
                                "storageKey": null,
                                "args": null,
                                "concreteType": "PullRequestReviewCommentEdge",
                                "plural": true,
                                "selections": [
                                  (v11/*: any*/),
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
                                        "name": "viewerCanReact",
                                        "args": null,
                                        "storageKey": null
                                      },
                                      (v4/*: any*/),
                                      (v12/*: any*/),
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
                                        "kind": "LinkedField",
                                        "alias": null,
                                        "name": "author",
                                        "storageKey": null,
                                        "args": null,
                                        "concreteType": null,
                                        "plural": false,
                                        "selections": [
                                          (v3/*: any*/),
                                          (v13/*: any*/),
                                          (v6/*: any*/),
                                          (v4/*: any*/)
                                        ]
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
                                        "kind": "ScalarField",
                                        "alias": null,
                                        "name": "createdAt",
                                        "args": null,
                                        "storageKey": null
                                      },
                                      (v8/*: any*/),
                                      (v14/*: any*/),
                                      (v3/*: any*/)
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
                            "args": (v16/*: any*/),
                            "handle": "connection",
                            "key": "ReviewCommentsAccumulator_comments",
                            "filters": null
                          },
                          (v3/*: any*/)
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
                "args": (v15/*: any*/),
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
    "text": "query aggregatedReviewsContainerRefetchQuery(\n  $repoId: ID!\n  $prId: ID!\n  $reviewCount: Int!\n  $reviewCursor: String\n  $threadCount: Int!\n  $threadCursor: String\n  $commentCount: Int!\n  $commentCursor: String\n) {\n  repository: node(id: $repoId) {\n    __typename\n    ...prCheckoutController_repository\n    id\n  }\n  pullRequest: node(id: $prId) {\n    __typename\n    ...prCheckoutController_pullRequest\n    ...aggregatedReviewsContainer_pullRequest_qdneZ\n    id\n  }\n}\n\nfragment prCheckoutController_repository on Repository {\n  name\n  owner {\n    __typename\n    login\n    id\n  }\n}\n\nfragment prCheckoutController_pullRequest on PullRequest {\n  number\n  headRefName\n  headRepository {\n    name\n    url\n    sshUrl\n    owner {\n      __typename\n      login\n      id\n    }\n    id\n  }\n}\n\nfragment aggregatedReviewsContainer_pullRequest_qdneZ on PullRequest {\n  ...reviewSummariesAccumulator_pullRequest_2zzc96\n  ...reviewThreadsAccumulator_pullRequest_CKDvj\n}\n\nfragment reviewSummariesAccumulator_pullRequest_2zzc96 on PullRequest {\n  url\n  reviews(first: $reviewCount, after: $reviewCursor) {\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    edges {\n      cursor\n      node {\n        id\n        bodyHTML\n        state\n        submittedAt\n        author {\n          __typename\n          login\n          avatarUrl\n          ... on Node {\n            id\n          }\n        }\n        ... on Reactable {\n          reactionGroups {\n            content\n            users {\n              totalCount\n            }\n          }\n        }\n        __typename\n      }\n    }\n  }\n}\n\nfragment reviewThreadsAccumulator_pullRequest_CKDvj on PullRequest {\n  url\n  reviewThreads(first: $threadCount, after: $threadCursor) {\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    edges {\n      cursor\n      node {\n        id\n        isResolved\n        viewerCanResolve\n        viewerCanUnresolve\n        ...reviewCommentsAccumulator_reviewThread_1VbUmL\n        __typename\n      }\n    }\n  }\n}\n\nfragment reviewCommentsAccumulator_reviewThread_1VbUmL on PullRequestReviewThread {\n  id\n  comments(first: $commentCount, after: $commentCursor) {\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    edges {\n      cursor\n      node {\n        id\n        author {\n          __typename\n          avatarUrl\n          login\n          ... on Node {\n            id\n          }\n        }\n        bodyHTML\n        isMinimized\n        minimizedReason\n        viewerCanMinimize\n        viewerCanReact\n        path\n        position\n        createdAt\n        url\n        ... on Reactable {\n          reactionGroups {\n            content\n            users {\n              totalCount\n            }\n          }\n        }\n        __typename\n      }\n    }\n  }\n}\n",
    "metadata": {}
  }
};
})();
// prettier-ignore
(node/*: any*/).hash = '8a886c7cdbcc8ade86e25e764671d7cb';
module.exports = node;
