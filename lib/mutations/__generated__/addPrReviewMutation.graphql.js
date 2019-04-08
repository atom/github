/**
 * @flow
 * @relayHash 7307f4d80765c6cfa54e21823c6b8e91
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteRequest } from 'relay-runtime';
type emojiReactionsController_reactable$ref = any;
export type PullRequestReviewEvent = "APPROVE" | "COMMENT" | "DISMISS" | "REQUEST_CHANGES" | "%future added value";
export type PullRequestReviewState = "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED" | "DISMISSED" | "PENDING" | "%future added value";
export type AddPullRequestReviewInput = {|
  pullRequestId: string,
  commitOID?: ?any,
  body?: ?string,
  event?: ?PullRequestReviewEvent,
  comments?: ?$ReadOnlyArray<?DraftPullRequestReviewComment>,
  clientMutationId?: ?string,
|};
export type DraftPullRequestReviewComment = {|
  path: string,
  position: number,
  body: string,
|};
export type addPrReviewMutationVariables = {|
  input: AddPullRequestReviewInput
|};
export type addPrReviewMutationResponse = {|
  +addPullRequestReview: ?{|
    +reviewEdge: ?{|
      +node: ?{|
        +id: string,
        +bodyHTML: any,
        +state: PullRequestReviewState,
        +submittedAt: ?any,
        +author: ?{|
          +login: string,
          +avatarUrl: any,
        |},
        +$fragmentRefs: emojiReactionsController_reactable$ref,
      |}
    |}
  |}
|};
export type addPrReviewMutation = {|
  variables: addPrReviewMutationVariables,
  response: addPrReviewMutationResponse,
|};
*/


/*
mutation addPrReviewMutation(
  $input: AddPullRequestReviewInput!
) {
  addPullRequestReview(input: $input) {
    reviewEdge {
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
    "type": "AddPullRequestReviewInput!",
    "defaultValue": null
  }
],
v1 = [
  {
    "kind": "Variable",
    "name": "input",
    "variableName": "input",
    "type": "AddPullRequestReviewInput!"
  }
],
v2 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "id",
  "args": null,
  "storageKey": null
},
v3 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "bodyHTML",
  "args": null,
  "storageKey": null
},
v4 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "state",
  "args": null,
  "storageKey": null
},
v5 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "submittedAt",
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
  "name": "avatarUrl",
  "args": null,
  "storageKey": null
};
return {
  "kind": "Request",
  "fragment": {
    "kind": "Fragment",
    "name": "addPrReviewMutation",
    "type": "Mutation",
    "metadata": null,
    "argumentDefinitions": (v0/*: any*/),
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "name": "addPullRequestReview",
        "storageKey": null,
        "args": (v1/*: any*/),
        "concreteType": "AddPullRequestReviewPayload",
        "plural": false,
        "selections": [
          {
            "kind": "LinkedField",
            "alias": null,
            "name": "reviewEdge",
            "storageKey": null,
            "args": null,
            "concreteType": "PullRequestReviewEdge",
            "plural": false,
            "selections": [
              {
                "kind": "LinkedField",
                "alias": null,
                "name": "node",
                "storageKey": null,
                "args": null,
                "concreteType": "PullRequestReview",
                "plural": false,
                "selections": [
                  (v2/*: any*/),
                  (v3/*: any*/),
                  (v4/*: any*/),
                  (v5/*: any*/),
                  {
                    "kind": "LinkedField",
                    "alias": null,
                    "name": "author",
                    "storageKey": null,
                    "args": null,
                    "concreteType": null,
                    "plural": false,
                    "selections": [
                      (v6/*: any*/),
                      (v7/*: any*/)
                    ]
                  },
                  {
                    "kind": "FragmentSpread",
                    "name": "emojiReactionsController_reactable",
                    "args": null
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
    "name": "addPrReviewMutation",
    "argumentDefinitions": (v0/*: any*/),
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "name": "addPullRequestReview",
        "storageKey": null,
        "args": (v1/*: any*/),
        "concreteType": "AddPullRequestReviewPayload",
        "plural": false,
        "selections": [
          {
            "kind": "LinkedField",
            "alias": null,
            "name": "reviewEdge",
            "storageKey": null,
            "args": null,
            "concreteType": "PullRequestReviewEdge",
            "plural": false,
            "selections": [
              {
                "kind": "LinkedField",
                "alias": null,
                "name": "node",
                "storageKey": null,
                "args": null,
                "concreteType": "PullRequestReview",
                "plural": false,
                "selections": [
                  (v2/*: any*/),
                  (v3/*: any*/),
                  (v4/*: any*/),
                  (v5/*: any*/),
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
                      (v6/*: any*/),
                      (v7/*: any*/),
                      (v2/*: any*/)
                    ]
                  },
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
                    "kind": "ScalarField",
                    "alias": null,
                    "name": "viewerCanReact",
                    "args": null,
                    "storageKey": null
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
    "name": "addPrReviewMutation",
    "id": null,
    "text": "mutation addPrReviewMutation(\n  $input: AddPullRequestReviewInput!\n) {\n  addPullRequestReview(input: $input) {\n    reviewEdge {\n      node {\n        id\n        bodyHTML\n        state\n        submittedAt\n        author {\n          __typename\n          login\n          avatarUrl\n          ... on Node {\n            id\n          }\n        }\n        ...emojiReactionsController_reactable\n      }\n    }\n  }\n}\n\nfragment emojiReactionsController_reactable on Reactable {\n  id\n  ...emojiReactionsView_reactable\n}\n\nfragment emojiReactionsView_reactable on Reactable {\n  id\n  reactionGroups {\n    content\n    viewerHasReacted\n    users {\n      totalCount\n    }\n  }\n  viewerCanReact\n}\n",
    "metadata": {}
  }
};
})();
// prettier-ignore
(node/*: any*/).hash = '765a0aef6c6805d1733e99f53db0e82b';
module.exports = node;
