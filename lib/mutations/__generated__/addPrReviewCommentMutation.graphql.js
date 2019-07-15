/**
 * @flow
 * @relayHash ee463683f413bd007aff460bfcc79e73
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteRequest } from 'relay-runtime';
type emojiReactionsController_reactable$ref = any;
export type CommentAuthorAssociation = "COLLABORATOR" | "CONTRIBUTOR" | "FIRST_TIMER" | "FIRST_TIME_CONTRIBUTOR" | "MEMBER" | "NONE" | "OWNER" | "%future added value";
export type PullRequestReviewCommentState = "PENDING" | "SUBMITTED" | "%future added value";
export type AddPullRequestReviewCommentInput = {|
  pullRequestReviewId: string,
  commitOID?: ?any,
  body: string,
  path?: ?string,
  position?: ?number,
  inReplyTo?: ?string,
  clientMutationId?: ?string,
|};
export type addPrReviewCommentMutationVariables = {|
  input: AddPullRequestReviewCommentInput
|};
export type addPrReviewCommentMutationResponse = {|
  +addPullRequestReviewComment: ?{|
    +commentEdge: ?{|
      +node: ?{|
        +id: string,
        +author: ?{|
          +avatarUrl: any,
          +login: string,
        |},
        +body: string,
        +bodyHTML: any,
        +isMinimized: boolean,
        +viewerCanReact: boolean,
        +viewerCanUpdate: boolean,
        +path: string,
        +position: ?number,
        +createdAt: any,
        +lastEditedAt: ?any,
        +url: any,
        +authorAssociation: CommentAuthorAssociation,
        +state: PullRequestReviewCommentState,
        +pullRequest: {|
          +reviewThreads: {|
            +edges: ?$ReadOnlyArray<?{|
              +cursor: string,
              +node: ?{|
                +id: string
              |},
            |}>
          |}
        |},
        +$fragmentRefs: emojiReactionsController_reactable$ref,
      |}
    |}
  |}
|};
export type addPrReviewCommentMutation = {|
  variables: addPrReviewCommentMutationVariables,
  response: addPrReviewCommentMutationResponse,
|};
*/


/*
mutation addPrReviewCommentMutation(
  $input: AddPullRequestReviewCommentInput!
) {
  addPullRequestReviewComment(input: $input) {
    commentEdge {
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
        body
        bodyHTML
        isMinimized
        viewerCanReact
        viewerCanUpdate
        path
        position
        createdAt
        lastEditedAt
        url
        authorAssociation
        state
        ...emojiReactionsController_reactable
        pullRequest {
          reviewThreads(last: 1) {
            edges {
              cursor
              node {
                id
              }
            }
          }
          id
        }
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
    "name": "input",
    "type": "AddPullRequestReviewCommentInput!",
    "defaultValue": null
  }
],
v1 = [
  {
    "kind": "Variable",
    "name": "input",
    "variableName": "input",
    "type": "AddPullRequestReviewCommentInput!"
  }
],
v2 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "position",
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
  "name": "body",
  "args": null,
  "storageKey": null
},
v5 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "bodyHTML",
  "args": null,
  "storageKey": null
},
v6 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "isMinimized",
  "args": null,
  "storageKey": null
},
v7 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "viewerCanReact",
  "args": null,
  "storageKey": null
},
v8 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "viewerCanUpdate",
  "args": null,
  "storageKey": null
},
v9 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "path",
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
  "kind": "ScalarField",
  "alias": null,
  "name": "login",
  "args": null,
  "storageKey": null
},
v12 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "createdAt",
  "args": null,
  "storageKey": null
},
v13 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "lastEditedAt",
  "args": null,
  "storageKey": null
},
v14 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "url",
  "args": null,
  "storageKey": null
},
v15 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "authorAssociation",
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
  "kind": "LinkedField",
  "alias": null,
  "name": "reviewThreads",
  "storageKey": "reviewThreads(last:1)",
  "args": [
    {
      "kind": "Literal",
      "name": "last",
      "value": 1,
      "type": "Int"
    }
  ],
  "concreteType": "PullRequestReviewThreadConnection",
  "plural": false,
  "selections": [
    {
      "kind": "LinkedField",
      "alias": null,
      "name": "edges",
      "storageKey": null,
      "args": null,
      "concreteType": "PullRequestReviewThreadEdge",
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
          "concreteType": "PullRequestReviewThread",
          "plural": false,
          "selections": [
            (v3/*: any*/)
          ]
        }
      ]
    }
  ]
};
return {
  "kind": "Request",
  "fragment": {
    "kind": "Fragment",
    "name": "addPrReviewCommentMutation",
    "type": "Mutation",
    "metadata": null,
    "argumentDefinitions": (v0/*: any*/),
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "name": "addPullRequestReviewComment",
        "storageKey": null,
        "args": (v1/*: any*/),
        "concreteType": "AddPullRequestReviewCommentPayload",
        "plural": false,
        "selections": [
          {
            "kind": "LinkedField",
            "alias": null,
            "name": "commentEdge",
            "storageKey": null,
            "args": null,
            "concreteType": "PullRequestReviewCommentEdge",
            "plural": false,
            "selections": [
              {
                "kind": "LinkedField",
                "alias": null,
                "name": "node",
                "storageKey": null,
                "args": null,
                "concreteType": "PullRequestReviewComment",
                "plural": false,
                "selections": [
                  (v2/*: any*/),
                  (v3/*: any*/),
                  (v4/*: any*/),
                  (v5/*: any*/),
                  (v6/*: any*/),
                  (v7/*: any*/),
                  (v8/*: any*/),
                  (v9/*: any*/),
                  {
                    "kind": "LinkedField",
                    "alias": null,
                    "name": "author",
                    "storageKey": null,
                    "args": null,
                    "concreteType": null,
                    "plural": false,
                    "selections": [
                      (v10/*: any*/),
                      (v11/*: any*/)
                    ]
                  },
                  (v12/*: any*/),
                  (v13/*: any*/),
                  (v14/*: any*/),
                  (v15/*: any*/),
                  (v16/*: any*/),
                  {
                    "kind": "FragmentSpread",
                    "name": "emojiReactionsController_reactable",
                    "args": null
                  },
                  {
                    "kind": "LinkedField",
                    "alias": null,
                    "name": "pullRequest",
                    "storageKey": null,
                    "args": null,
                    "concreteType": "PullRequest",
                    "plural": false,
                    "selections": [
                      (v17/*: any*/)
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
    "name": "addPrReviewCommentMutation",
    "argumentDefinitions": (v0/*: any*/),
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "name": "addPullRequestReviewComment",
        "storageKey": null,
        "args": (v1/*: any*/),
        "concreteType": "AddPullRequestReviewCommentPayload",
        "plural": false,
        "selections": [
          {
            "kind": "LinkedField",
            "alias": null,
            "name": "commentEdge",
            "storageKey": null,
            "args": null,
            "concreteType": "PullRequestReviewCommentEdge",
            "plural": false,
            "selections": [
              {
                "kind": "LinkedField",
                "alias": null,
                "name": "node",
                "storageKey": null,
                "args": null,
                "concreteType": "PullRequestReviewComment",
                "plural": false,
                "selections": [
                  (v2/*: any*/),
                  (v3/*: any*/),
                  (v4/*: any*/),
                  (v5/*: any*/),
                  (v6/*: any*/),
                  (v7/*: any*/),
                  (v8/*: any*/),
                  (v9/*: any*/),
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
                      (v10/*: any*/),
                      (v11/*: any*/),
                      (v3/*: any*/)
                    ]
                  },
                  (v12/*: any*/),
                  (v13/*: any*/),
                  (v14/*: any*/),
                  (v15/*: any*/),
                  (v16/*: any*/),
                  {
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
                  {
                    "kind": "LinkedField",
                    "alias": null,
                    "name": "pullRequest",
                    "storageKey": null,
                    "args": null,
                    "concreteType": "PullRequest",
                    "plural": false,
                    "selections": [
                      (v17/*: any*/),
                      (v3/*: any*/)
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
  "params": {
    "operationKind": "mutation",
    "name": "addPrReviewCommentMutation",
    "id": null,
    "text": "mutation addPrReviewCommentMutation(\n  $input: AddPullRequestReviewCommentInput!\n) {\n  addPullRequestReviewComment(input: $input) {\n    commentEdge {\n      node {\n        id\n        author {\n          __typename\n          avatarUrl\n          login\n          ... on Node {\n            id\n          }\n        }\n        body\n        bodyHTML\n        isMinimized\n        viewerCanReact\n        viewerCanUpdate\n        path\n        position\n        createdAt\n        lastEditedAt\n        url\n        authorAssociation\n        state\n        ...emojiReactionsController_reactable\n        pullRequest {\n          reviewThreads(last: 1) {\n            edges {\n              cursor\n              node {\n                id\n              }\n            }\n          }\n          id\n        }\n      }\n    }\n  }\n}\n\nfragment emojiReactionsController_reactable on Reactable {\n  id\n  ...emojiReactionsView_reactable\n}\n\nfragment emojiReactionsView_reactable on Reactable {\n  id\n  reactionGroups {\n    content\n    viewerHasReacted\n    users {\n      totalCount\n    }\n  }\n  viewerCanReact\n}\n",
    "metadata": {}
  }
};
})();
// prettier-ignore
(node/*: any*/).hash = 'c1f2751b3721e91d675c372058f1bff0';
module.exports = node;
