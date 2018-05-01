/**
 * @flow
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteFragment } from 'relay-runtime';
type prStatusesContainer_pullRequest$ref = any;
export type PullRequestState = "CLOSED" | "MERGED" | "OPEN" | "%future added value";
export type ReactionContent = "CONFUSED" | "HEART" | "HOORAY" | "LAUGH" | "THUMBS_DOWN" | "THUMBS_UP" | "%future added value";
import type { FragmentReference } from "relay-runtime";
declare export opaque type prInfoContainer_pullRequest$ref: FragmentReference;
export type prInfoContainer_pullRequest = {|
  +id: string,
  +url: any,
  +number: number,
  +title: string,
  +state: PullRequestState,
  +createdAt: any,
  +author: ?{|
    +login: string,
    +avatarUrl: any,
    +url?: any,
  |},
  +repository: {|
    +name: string,
    +owner: {|
      +login: string
    |},
  |},
  +reactionGroups: ?$ReadOnlyArray<{|
    +content: ReactionContent,
    +users: {|
      +totalCount: number
    |},
  |}>,
  +commitsCount: {|
    +totalCount: number
  |},
  +labels: ?{|
    +edges: ?$ReadOnlyArray<?{|
      +node: ?{|
        +name: string,
        +color: string,
      |}
    |}>
  |},
  +$fragmentRefs: prStatusesContainer_pullRequest$ref,
  +$refType: prInfoContainer_pullRequest$ref,
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
  "kind": "ScalarField",
  "alias": null,
  "name": "login",
  "args": null,
  "storageKey": null
},
v2 = [
  v0
],
v3 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "name",
  "args": null,
  "storageKey": null
},
v4 = [
  {
    "kind": "ScalarField",
    "alias": null,
    "name": "totalCount",
    "args": null,
    "storageKey": null
  }
];
return {
  "kind": "Fragment",
  "name": "prInfoContainer_pullRequest",
  "type": "PullRequest",
  "metadata": null,
  "argumentDefinitions": [],
  "selections": [
    {
      "kind": "ScalarField",
      "alias": null,
      "name": "createdAt",
      "args": null,
      "storageKey": null
    },
    {
      "kind": "FragmentSpread",
      "name": "prStatusesContainer_pullRequest",
      "args": null
    },
    v0,
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
      "name": "state",
      "args": null,
      "storageKey": null
    },
    {
      "kind": "ScalarField",
      "alias": null,
      "name": "id",
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
        v1,
        {
          "kind": "ScalarField",
          "alias": null,
          "name": "avatarUrl",
          "args": null,
          "storageKey": null
        },
        {
          "kind": "InlineFragment",
          "type": "Bot",
          "selections": v2
        },
        {
          "kind": "InlineFragment",
          "type": "User",
          "selections": v2
        }
      ]
    },
    {
      "kind": "LinkedField",
      "alias": null,
      "name": "repository",
      "storageKey": null,
      "args": null,
      "concreteType": "Repository",
      "plural": false,
      "selections": [
        v3,
        {
          "kind": "LinkedField",
          "alias": null,
          "name": "owner",
          "storageKey": null,
          "args": null,
          "concreteType": null,
          "plural": false,
          "selections": [
            v1
          ]
        }
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
          "kind": "LinkedField",
          "alias": null,
          "name": "users",
          "storageKey": null,
          "args": null,
          "concreteType": "ReactingUserConnection",
          "plural": false,
          "selections": v4
        }
      ]
    },
    {
      "kind": "LinkedField",
      "alias": "commitsCount",
      "name": "commits",
      "storageKey": null,
      "args": null,
      "concreteType": "PullRequestCommitConnection",
      "plural": false,
      "selections": v4
    },
    {
      "kind": "LinkedField",
      "alias": null,
      "name": "labels",
      "storageKey": "labels(first:100)",
      "args": [
        {
          "kind": "Literal",
          "name": "first",
          "value": 100,
          "type": "Int"
        }
      ],
      "concreteType": "LabelConnection",
      "plural": false,
      "selections": [
        {
          "kind": "LinkedField",
          "alias": null,
          "name": "edges",
          "storageKey": null,
          "args": null,
          "concreteType": "LabelEdge",
          "plural": true,
          "selections": [
            {
              "kind": "LinkedField",
              "alias": null,
              "name": "node",
              "storageKey": null,
              "args": null,
              "concreteType": "Label",
              "plural": false,
              "selections": [
                v3,
                {
                  "kind": "ScalarField",
                  "alias": null,
                  "name": "color",
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
(node/*: any*/).hash = 'c65b180836c0f22ff0492dd3d18276d0';
module.exports = node;
