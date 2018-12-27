/**
 * @flow
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteFragment } from 'relay-runtime';
export type PullRequestReviewState = "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED" | "DISMISSED" | "PENDING" | "%future added value";
import type { FragmentReference } from "relay-runtime";
declare export opaque type prReviewsContainer_pullRequest$ref: FragmentReference;
export type prReviewsContainer_pullRequest = {|
  +url: any,
  +reviews: ?{|
    +pageInfo: {|
      +hasNextPage: boolean,
      +endCursor: ?string,
    |},
    +edges: ?$ReadOnlyArray<?{|
      +cursor: string,
      +node: ?{|
        +id: string,
        +body: string,
        +commitId: ?{|
          +oid: any
        |},
        +state: PullRequestReviewState,
        +submittedAt: ?any,
        +login: ?{|
          +login: string
        |},
        +author: ?{|
          +avatarUrl: any
        |},
        +comments: {|
          +pageInfo: {|
            +hasNextPage: boolean,
            +endCursor: ?string,
          |},
          +nodes: ?$ReadOnlyArray<?{|
            +id: string,
            +author: ?{|
              +avatarUrl: any,
              +login: string,
            |},
            +bodyHTML: any,
            +path: string,
            +position: ?number,
            +replyTo: ?{|
              +id: string
            |},
            +createdAt: any,
            +url: any,
          |}>,
        |},
      |},
    |}>,
  |},
  +$refType: prReviewsContainer_pullRequest$ref,
|};
*/


const node/*: ConcreteFragment*/ = (function(){
var v0 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "url",
  "args": null,
  "storageKey": null
},
v1 = {
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
  "name": "login",
  "args": null,
  "storageKey": null
},
v4 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "avatarUrl",
  "args": null,
  "storageKey": null
};
return {
  "kind": "Fragment",
  "name": "prReviewsContainer_pullRequest",
  "type": "PullRequest",
  "metadata": {
    "connection": [
      {
        "count": "reviewCount",
        "cursor": "reviewCursor",
        "direction": "forward",
        "path": [
          "reviews"
        ]
      }
    ]
  },
  "argumentDefinitions": [
    {
      "kind": "LocalArgument",
      "name": "reviewCount",
      "type": "Int",
      "defaultValue": null
    },
    {
      "kind": "LocalArgument",
      "name": "reviewCursor",
      "type": "String",
      "defaultValue": null
    }
  ],
  "selections": [
    v0,
    {
      "kind": "LinkedField",
      "alias": "reviews",
      "name": "__prReviewsContainer_reviews_connection",
      "storageKey": null,
      "args": null,
      "concreteType": "PullRequestReviewConnection",
      "plural": false,
      "selections": [
        v1,
        {
          "kind": "LinkedField",
          "alias": null,
          "name": "edges",
          "storageKey": null,
          "args": null,
          "concreteType": "PullRequestReviewEdge",
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
              "concreteType": "PullRequestReview",
              "plural": false,
              "selections": [
                v2,
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
                    }
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
                    v4
                  ]
                },
                {
                  "kind": "LinkedField",
                  "alias": null,
                  "name": "comments",
                  "storageKey": "comments(first:100)",
                  "args": [
                    {
                      "kind": "Literal",
                      "name": "first",
                      "value": 100,
                      "type": "Int"
                    }
                  ],
                  "concreteType": "PullRequestReviewCommentConnection",
                  "plural": false,
                  "selections": [
                    v1,
                    {
                      "kind": "LinkedField",
                      "alias": null,
                      "name": "nodes",
                      "storageKey": null,
                      "args": null,
                      "concreteType": "PullRequestReviewComment",
                      "plural": true,
                      "selections": [
                        v2,
                        {
                          "kind": "LinkedField",
                          "alias": null,
                          "name": "author",
                          "storageKey": null,
                          "args": null,
                          "concreteType": null,
                          "plural": false,
                          "selections": [
                            v4,
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
                            v2
                          ]
                        },
                        {
                          "kind": "ScalarField",
                          "alias": null,
                          "name": "createdAt",
                          "args": null,
                          "storageKey": null
                        },
                        v0
                      ]
                    }
                  ]
                },
                {
                  "kind": "ScalarField",
                  "alias": null,
                  "name": "__typename",
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
};
})();
// prettier-ignore
(node/*: any*/).hash = 'd22654576b18d8a49cff9628b69d7b17';
module.exports = node;
