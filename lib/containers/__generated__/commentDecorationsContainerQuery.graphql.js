/**
 * @flow
 * @relayHash 1c6873b48bac1f124cab8f2f775c87a3
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteRequest } from 'relay-runtime';
type aggregatedReviewsContainer_pullRequest$ref = any;
type commentDecorationsController_pullRequests$ref = any;
export type commentDecorationsContainerQueryVariables = {|
  headOwner: string,
  headName: string,
  headRef: string,
  reviewCount: number,
  reviewCursor?: ?string,
  threadCount: number,
  threadCursor?: ?string,
  commentCount: number,
  commentCursor?: ?string,
  first: number,
|};
export type commentDecorationsContainerQueryResponse = {|
  +repository: ?{|
    +ref: ?{|
      +associatedPullRequests: {|
        +totalCount: number,
        +nodes: ?$ReadOnlyArray<?{|
          +number: number,
          +headRefOid: any,
          +$fragmentRefs: commentDecorationsController_pullRequests$ref & aggregatedReviewsContainer_pullRequest$ref,
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
  $reviewCount: Int!
  $reviewCursor: String
  $threadCount: Int!
  $threadCursor: String
  $commentCount: Int!
  $commentCursor: String
  $first: Int!
) {
  repository(owner: $headOwner, name: $headName) {
    ref(qualifiedName: $headRef) {
      associatedPullRequests(first: $first, states: [OPEN]) {
        totalCount
        nodes {
          number
          headRefOid
          ...commentDecorationsController_pullRequests
          ...aggregatedReviewsContainer_pullRequest_qdneZ
          id
        }
      }
      id
    }
    id
  }
}

fragment commentDecorationsController_pullRequests on PullRequest {
  number
  headRefName
  headRefOid
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
    name
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
        lastEditedAt
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
        state
        viewerCanReact
        path
        position
        createdAt
        lastEditedAt
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
  "name": "number",
  "args": null,
  "storageKey": null
},
v6 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "headRefOid",
  "args": null,
  "storageKey": null
},
v7 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "__typename",
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
  "name": "id",
  "args": null,
  "storageKey": null
},
v10 = [
  {
    "kind": "ScalarField",
    "alias": null,
    "name": "name",
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
      (v7/*: any*/),
      (v8/*: any*/),
      (v9/*: any*/)
    ]
  },
  (v9/*: any*/)
],
v11 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "url",
  "args": null,
  "storageKey": null
},
v12 = [
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
v13 = {
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
v14 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "cursor",
  "args": null,
  "storageKey": null
},
v15 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "bodyHTML",
  "args": null,
  "storageKey": null
},
v16 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "state",
  "args": null,
  "storageKey": null
},
v17 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "lastEditedAt",
  "args": null,
  "storageKey": null
},
v18 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "avatarUrl",
  "args": null,
  "storageKey": null
},
v19 = {
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
        (v4/*: any*/)
      ]
    }
  ]
},
v20 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "viewerCanReact",
  "args": null,
  "storageKey": null
},
v21 = [
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
v22 = [
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
                      (v5/*: any*/),
                      (v6/*: any*/),
                      {
                        "kind": "FragmentSpread",
                        "name": "commentDecorationsController_pullRequests",
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
                      (v5/*: any*/),
                      (v6/*: any*/),
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
                        "selections": (v10/*: any*/)
                      },
                      {
                        "kind": "LinkedField",
                        "alias": null,
                        "name": "repository",
                        "storageKey": null,
                        "args": null,
                        "concreteType": "Repository",
                        "plural": false,
                        "selections": (v10/*: any*/)
                      },
                      (v9/*: any*/),
                      (v11/*: any*/),
                      {
                        "kind": "LinkedField",
                        "alias": null,
                        "name": "reviews",
                        "storageKey": null,
                        "args": (v12/*: any*/),
                        "concreteType": "PullRequestReviewConnection",
                        "plural": false,
                        "selections": [
                          (v13/*: any*/),
                          {
                            "kind": "LinkedField",
                            "alias": null,
                            "name": "edges",
                            "storageKey": null,
                            "args": null,
                            "concreteType": "PullRequestReviewEdge",
                            "plural": true,
                            "selections": [
                              (v14/*: any*/),
                              {
                                "kind": "LinkedField",
                                "alias": null,
                                "name": "node",
                                "storageKey": null,
                                "args": null,
                                "concreteType": "PullRequestReview",
                                "plural": false,
                                "selections": [
                                  (v9/*: any*/),
                                  (v15/*: any*/),
                                  (v16/*: any*/),
                                  {
                                    "kind": "ScalarField",
                                    "alias": null,
                                    "name": "submittedAt",
                                    "args": null,
                                    "storageKey": null
                                  },
                                  (v17/*: any*/),
                                  {
                                    "kind": "LinkedField",
                                    "alias": null,
                                    "name": "author",
                                    "storageKey": null,
                                    "args": null,
                                    "concreteType": null,
                                    "plural": false,
                                    "selections": [
                                      (v7/*: any*/),
                                      (v8/*: any*/),
                                      (v18/*: any*/),
                                      (v9/*: any*/)
                                    ]
                                  },
                                  (v19/*: any*/),
                                  (v20/*: any*/),
                                  (v7/*: any*/)
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
                        "args": (v12/*: any*/),
                        "handle": "connection",
                        "key": "ReviewSummariesAccumulator_reviews",
                        "filters": null
                      },
                      {
                        "kind": "LinkedField",
                        "alias": null,
                        "name": "reviewThreads",
                        "storageKey": null,
                        "args": (v21/*: any*/),
                        "concreteType": "PullRequestReviewThreadConnection",
                        "plural": false,
                        "selections": [
                          (v13/*: any*/),
                          {
                            "kind": "LinkedField",
                            "alias": null,
                            "name": "edges",
                            "storageKey": null,
                            "args": null,
                            "concreteType": "PullRequestReviewThreadEdge",
                            "plural": true,
                            "selections": [
                              (v14/*: any*/),
                              {
                                "kind": "LinkedField",
                                "alias": null,
                                "name": "node",
                                "storageKey": null,
                                "args": null,
                                "concreteType": "PullRequestReviewThread",
                                "plural": false,
                                "selections": [
                                  (v9/*: any*/),
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
                                      (v8/*: any*/),
                                      (v9/*: any*/)
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
                                    "args": (v22/*: any*/),
                                    "concreteType": "PullRequestReviewCommentConnection",
                                    "plural": false,
                                    "selections": [
                                      (v13/*: any*/),
                                      {
                                        "kind": "LinkedField",
                                        "alias": null,
                                        "name": "edges",
                                        "storageKey": null,
                                        "args": null,
                                        "concreteType": "PullRequestReviewCommentEdge",
                                        "plural": true,
                                        "selections": [
                                          (v14/*: any*/),
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
                                              (v9/*: any*/),
                                              (v15/*: any*/),
                                              {
                                                "kind": "ScalarField",
                                                "alias": null,
                                                "name": "isMinimized",
                                                "args": null,
                                                "storageKey": null
                                              },
                                              (v16/*: any*/),
                                              (v20/*: any*/),
                                              {
                                                "kind": "LinkedField",
                                                "alias": null,
                                                "name": "author",
                                                "storageKey": null,
                                                "args": null,
                                                "concreteType": null,
                                                "plural": false,
                                                "selections": [
                                                  (v7/*: any*/),
                                                  (v18/*: any*/),
                                                  (v8/*: any*/),
                                                  (v9/*: any*/)
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
                                                "name": "createdAt",
                                                "args": null,
                                                "storageKey": null
                                              },
                                              (v17/*: any*/),
                                              (v11/*: any*/),
                                              (v19/*: any*/),
                                              (v7/*: any*/)
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
                                    "args": (v22/*: any*/),
                                    "handle": "connection",
                                    "key": "ReviewCommentsAccumulator_comments",
                                    "filters": null
                                  },
                                  (v7/*: any*/)
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
                        "args": (v21/*: any*/),
                        "handle": "connection",
                        "key": "ReviewThreadsAccumulator_reviewThreads",
                        "filters": null
                      }
                    ]
                  }
                ]
              },
              (v9/*: any*/)
            ]
          },
          (v9/*: any*/)
        ]
      }
    ]
  },
  "params": {
    "operationKind": "query",
    "name": "commentDecorationsContainerQuery",
    "id": null,
    "text": "query commentDecorationsContainerQuery(\n  $headOwner: String!\n  $headName: String!\n  $headRef: String!\n  $reviewCount: Int!\n  $reviewCursor: String\n  $threadCount: Int!\n  $threadCursor: String\n  $commentCount: Int!\n  $commentCursor: String\n  $first: Int!\n) {\n  repository(owner: $headOwner, name: $headName) {\n    ref(qualifiedName: $headRef) {\n      associatedPullRequests(first: $first, states: [OPEN]) {\n        totalCount\n        nodes {\n          number\n          headRefOid\n          ...commentDecorationsController_pullRequests\n          ...aggregatedReviewsContainer_pullRequest_qdneZ\n          id\n        }\n      }\n      id\n    }\n    id\n  }\n}\n\nfragment commentDecorationsController_pullRequests on PullRequest {\n  number\n  headRefName\n  headRefOid\n  headRepository {\n    name\n    owner {\n      __typename\n      login\n      id\n    }\n    id\n  }\n  repository {\n    name\n    owner {\n      __typename\n      login\n      id\n    }\n    id\n  }\n}\n\nfragment aggregatedReviewsContainer_pullRequest_qdneZ on PullRequest {\n  id\n  ...reviewSummariesAccumulator_pullRequest_2zzc96\n  ...reviewThreadsAccumulator_pullRequest_CKDvj\n}\n\nfragment reviewSummariesAccumulator_pullRequest_2zzc96 on PullRequest {\n  url\n  reviews(first: $reviewCount, after: $reviewCursor) {\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    edges {\n      cursor\n      node {\n        id\n        bodyHTML\n        state\n        submittedAt\n        lastEditedAt\n        author {\n          __typename\n          login\n          avatarUrl\n          ... on Node {\n            id\n          }\n        }\n        ...emojiReactionsController_reactable\n        __typename\n      }\n    }\n  }\n}\n\nfragment reviewThreadsAccumulator_pullRequest_CKDvj on PullRequest {\n  url\n  reviewThreads(first: $threadCount, after: $threadCursor) {\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    edges {\n      cursor\n      node {\n        id\n        isResolved\n        resolvedBy {\n          login\n          id\n        }\n        viewerCanResolve\n        viewerCanUnresolve\n        ...reviewCommentsAccumulator_reviewThread_1VbUmL\n        __typename\n      }\n    }\n  }\n}\n\nfragment reviewCommentsAccumulator_reviewThread_1VbUmL on PullRequestReviewThread {\n  id\n  comments(first: $commentCount, after: $commentCursor) {\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    edges {\n      cursor\n      node {\n        id\n        author {\n          __typename\n          avatarUrl\n          login\n          ... on Node {\n            id\n          }\n        }\n        bodyHTML\n        isMinimized\n        state\n        viewerCanReact\n        path\n        position\n        createdAt\n        lastEditedAt\n        url\n        ...emojiReactionsController_reactable\n        __typename\n      }\n    }\n  }\n}\n\nfragment emojiReactionsController_reactable on Reactable {\n  id\n  ...emojiReactionsView_reactable\n}\n\nfragment emojiReactionsView_reactable on Reactable {\n  id\n  reactionGroups {\n    content\n    viewerHasReacted\n    users {\n      totalCount\n    }\n  }\n  viewerCanReact\n}\n",
    "metadata": {}
  }
};
})();
// prettier-ignore
(node/*: any*/).hash = '8154acbf4c24d190f6fdf0254ae73817';
module.exports = node;
