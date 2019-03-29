/**
 * @flow
 * @relayHash 972320548b2fc85b24309ed88357f4b8
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteRequest } from 'relay-runtime';
type reviewsController_pullRequest$ref = any;
type reviewsController_repository$ref = any;
type reviewsController_viewer$ref = any;
export type reviewsContainerQueryVariables = {|
  repoOwner: string,
  repoName: string,
  prNumber: number,
  reviewCount: number,
  reviewCursor?: ?string,
  threadCount: number,
  threadCursor?: ?string,
  commentCount: number,
  commentCursor?: ?string,
|};
export type reviewsContainerQueryResponse = {|
  +repository: ?{|
    +pullRequest: ?{|
      +$fragmentRefs: reviewsController_pullRequest$ref
    |},
    +$fragmentRefs: reviewsController_repository$ref,
  |},
  +viewer: {|
    +$fragmentRefs: reviewsController_viewer$ref
  |},
|};
export type reviewsContainerQuery = {|
  variables: reviewsContainerQueryVariables,
  response: reviewsContainerQueryResponse,
|};
*/


/*
query reviewsContainerQuery(
  $repoOwner: String!
  $repoName: String!
  $prNumber: Int!
  $reviewCount: Int!
  $reviewCursor: String
  $threadCount: Int!
  $threadCursor: String
  $commentCount: Int!
  $commentCursor: String
) {
  repository(owner: $repoOwner, name: $repoName) {
    ...reviewsController_repository
    pullRequest(number: $prNumber) {
      ...reviewsController_pullRequest_qdneZ
      id
    }
    id
  }
  viewer {
    ...reviewsController_viewer
    id
  }
}

fragment reviewsController_repository on Repository {
  ...prCheckoutController_repository
}

fragment reviewsController_pullRequest_qdneZ on PullRequest {
  id
  headRefOid
  ...prCheckoutController_pullRequest
  ...aggregatedReviewsContainer_pullRequest_qdneZ
}

fragment reviewsController_viewer on User {
  id
  login
  avatarUrl
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
        ...emojiReactionsController_reactable
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
        resolvedBy {
          login
          id
        }
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
        state
        viewerCanMinimize
        viewerCanReact
        path
        position
        diffHunk
        createdAt
        url
        ...emojiReactionsController_reactable
        __typename
      }
    }
  }
}

fragment emojiReactionsController_reactable on Reactable {
  id
  ...emojiReactionsView_reactable
}

fragment emojiReactionsView_reactable on Reactable {
  id
  reactionGroups {
    content
    viewerHasReacted
    users {
      totalCount
    }
  }
  viewerCanReact
}

fragment prCheckoutController_repository on Repository {
  name
  owner {
    __typename
    login
    id
  }
}
*/

const node/*: ConcreteRequest*/ = (function(){
var v0 = [
  {
    "kind": "LocalArgument",
    "name": "repoOwner",
    "type": "String!",
    "defaultValue": null
  },
  {
    "kind": "LocalArgument",
    "name": "repoName",
    "type": "String!",
    "defaultValue": null
  },
  {
    "kind": "LocalArgument",
    "name": "prNumber",
    "type": "Int!",
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
    "name": "name",
    "variableName": "repoName",
    "type": "String!"
  },
  {
    "kind": "Variable",
    "name": "owner",
    "variableName": "repoOwner",
    "type": "String!"
  }
],
v2 = [
  {
    "kind": "Variable",
    "name": "number",
    "variableName": "prNumber",
    "type": "Int!"
  }
],
v3 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "name",
  "args": null,
  "storageKey": null
},
v4 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "__typename",
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
v6 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "id",
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
    (v4/*: any*/),
    (v5/*: any*/),
    (v6/*: any*/)
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
  "name": "state",
  "args": null,
  "storageKey": null
},
v14 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "avatarUrl",
  "args": null,
  "storageKey": null
},
v15 = {
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
      "kind": "ScalarField",
      "alias": null,
      "name": "viewerHasReacted",
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
v16 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "viewerCanReact",
  "args": null,
  "storageKey": null
},
v17 = [
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
v18 = [
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
    "name": "reviewsContainerQuery",
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
            "kind": "FragmentSpread",
            "name": "reviewsController_repository",
            "args": null
          },
          {
            "kind": "LinkedField",
            "alias": null,
            "name": "pullRequest",
            "storageKey": null,
            "args": (v2/*: any*/),
            "concreteType": "PullRequest",
            "plural": false,
            "selections": [
              {
                "kind": "FragmentSpread",
                "name": "reviewsController_pullRequest",
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
      {
        "kind": "LinkedField",
        "alias": null,
        "name": "viewer",
        "storageKey": null,
        "args": null,
        "concreteType": "User",
        "plural": false,
        "selections": [
          {
            "kind": "FragmentSpread",
            "name": "reviewsController_viewer",
            "args": null
          }
        ]
      }
    ]
  },
  "operation": {
    "kind": "Operation",
    "name": "reviewsContainerQuery",
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
          (v3/*: any*/),
          (v7/*: any*/),
          {
            "kind": "LinkedField",
            "alias": null,
            "name": "pullRequest",
            "storageKey": null,
            "args": (v2/*: any*/),
            "concreteType": "PullRequest",
            "plural": false,
            "selections": [
              (v6/*: any*/),
              {
                "kind": "ScalarField",
                "alias": null,
                "name": "headRefOid",
                "args": null,
                "storageKey": null
              },
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
                  (v3/*: any*/),
                  (v8/*: any*/),
                  {
                    "kind": "ScalarField",
                    "alias": null,
                    "name": "sshUrl",
                    "args": null,
                    "storageKey": null
                  },
                  (v7/*: any*/),
                  (v6/*: any*/)
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
                          (v6/*: any*/),
                          (v12/*: any*/),
                          (v13/*: any*/),
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
                              (v4/*: any*/),
                              (v5/*: any*/),
                              (v14/*: any*/),
                              (v6/*: any*/)
                            ]
                          },
                          (v15/*: any*/),
                          (v16/*: any*/),
                          (v4/*: any*/)
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
                "args": (v17/*: any*/),
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
                          (v6/*: any*/),
                          {
                            "kind": "ScalarField",
                            "alias": null,
                            "name": "isResolved",
                            "args": null,
                            "storageKey": null
                          },
                          {
                            "kind": "LinkedField",
                            "alias": null,
                            "name": "resolvedBy",
                            "storageKey": null,
                            "args": null,
                            "concreteType": "User",
                            "plural": false,
                            "selections": [
                              (v5/*: any*/),
                              (v6/*: any*/)
                            ]
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
                            "args": (v18/*: any*/),
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
                                      (v16/*: any*/),
                                      (v6/*: any*/),
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
                                      (v13/*: any*/),
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
                                          (v4/*: any*/),
                                          (v14/*: any*/),
                                          (v5/*: any*/),
                                          (v6/*: any*/)
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
                                      (v8/*: any*/),
                                      (v15/*: any*/),
                                      (v4/*: any*/)
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
                            "args": (v18/*: any*/),
                            "handle": "connection",
                            "key": "ReviewCommentsAccumulator_comments",
                            "filters": null
                          },
                          (v4/*: any*/)
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
                "args": (v17/*: any*/),
                "handle": "connection",
                "key": "ReviewThreadsAccumulator_reviewThreads",
                "filters": null
              }
            ]
          },
          (v6/*: any*/)
        ]
      },
      {
        "kind": "LinkedField",
        "alias": null,
        "name": "viewer",
        "storageKey": null,
        "args": null,
        "concreteType": "User",
        "plural": false,
        "selections": [
          (v6/*: any*/),
          (v5/*: any*/),
          (v14/*: any*/)
        ]
      }
    ]
  },
  "params": {
    "operationKind": "query",
    "name": "reviewsContainerQuery",
    "id": null,
    "text": "query reviewsContainerQuery(\n  $repoOwner: String!\n  $repoName: String!\n  $prNumber: Int!\n  $reviewCount: Int!\n  $reviewCursor: String\n  $threadCount: Int!\n  $threadCursor: String\n  $commentCount: Int!\n  $commentCursor: String\n) {\n  repository(owner: $repoOwner, name: $repoName) {\n    ...reviewsController_repository\n    pullRequest(number: $prNumber) {\n      ...reviewsController_pullRequest_qdneZ\n      id\n    }\n    id\n  }\n  viewer {\n    ...reviewsController_viewer\n    id\n  }\n}\n\nfragment reviewsController_repository on Repository {\n  ...prCheckoutController_repository\n}\n\nfragment reviewsController_pullRequest_qdneZ on PullRequest {\n  id\n  headRefOid\n  ...prCheckoutController_pullRequest\n  ...aggregatedReviewsContainer_pullRequest_qdneZ\n}\n\nfragment reviewsController_viewer on User {\n  id\n  login\n  avatarUrl\n}\n\nfragment prCheckoutController_pullRequest on PullRequest {\n  number\n  headRefName\n  headRepository {\n    name\n    url\n    sshUrl\n    owner {\n      __typename\n      login\n      id\n    }\n    id\n  }\n}\n\nfragment aggregatedReviewsContainer_pullRequest_qdneZ on PullRequest {\n  id\n  ...reviewSummariesAccumulator_pullRequest_2zzc96\n  ...reviewThreadsAccumulator_pullRequest_CKDvj\n}\n\nfragment reviewSummariesAccumulator_pullRequest_2zzc96 on PullRequest {\n  url\n  reviews(first: $reviewCount, after: $reviewCursor) {\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    edges {\n      cursor\n      node {\n        id\n        bodyHTML\n        state\n        submittedAt\n        author {\n          __typename\n          login\n          avatarUrl\n          ... on Node {\n            id\n          }\n        }\n        ...emojiReactionsController_reactable\n        __typename\n      }\n    }\n  }\n}\n\nfragment reviewThreadsAccumulator_pullRequest_CKDvj on PullRequest {\n  url\n  reviewThreads(first: $threadCount, after: $threadCursor) {\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    edges {\n      cursor\n      node {\n        id\n        isResolved\n        resolvedBy {\n          login\n          id\n        }\n        viewerCanResolve\n        viewerCanUnresolve\n        ...reviewCommentsAccumulator_reviewThread_1VbUmL\n        __typename\n      }\n    }\n  }\n}\n\nfragment reviewCommentsAccumulator_reviewThread_1VbUmL on PullRequestReviewThread {\n  id\n  comments(first: $commentCount, after: $commentCursor) {\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    edges {\n      cursor\n      node {\n        id\n        author {\n          __typename\n          avatarUrl\n          login\n          ... on Node {\n            id\n          }\n        }\n        bodyHTML\n        isMinimized\n        minimizedReason\n        state\n        viewerCanMinimize\n        viewerCanReact\n        path\n        position\n        diffHunk\n        createdAt\n        url\n        ...emojiReactionsController_reactable\n        __typename\n      }\n    }\n  }\n}\n\nfragment emojiReactionsController_reactable on Reactable {\n  id\n  ...emojiReactionsView_reactable\n}\n\nfragment emojiReactionsView_reactable on Reactable {\n  id\n  reactionGroups {\n    content\n    viewerHasReacted\n    users {\n      totalCount\n    }\n  }\n  viewerCanReact\n}\n\nfragment prCheckoutController_repository on Repository {\n  name\n  owner {\n    __typename\n    login\n    id\n  }\n}\n",
    "metadata": {}
  }
};
})();
// prettier-ignore
(node/*: any*/).hash = 'a75c17deca5d629f34cc0cadfb3bb8d2';
module.exports = node;
