/**
 * @flow
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteFragment } from 'relay-runtime';
type issueTimelineController_issue$ref = any;
export type IssueState = "CLOSED" | "OPEN" | "%future added value";
export type ReactionContent = "CONFUSED" | "HEART" | "HOORAY" | "LAUGH" | "THUMBS_DOWN" | "THUMBS_UP" | "%future added value";
import type { FragmentReference } from "relay-runtime";
declare export opaque type issueDetailView_issue$ref: FragmentReference;
export type issueDetailView_issue = {|
  +id?: string,
  +state: IssueState,
  +number: number,
  +title: string,
  +bodyHTML: any,
  +author: ?{|
    +login: string,
    +avatarUrl: any,
    +url?: any,
  |},
  +url?: any,
  +reactionGroups?: ?$ReadOnlyArray<{|
    +content: ReactionContent,
    +users: {|
      +totalCount: number
    |},
  |}>,
  +__typename: "Issue",
  +$fragmentRefs: issueTimelineController_issue$ref,
  +$refType: issueDetailView_issue$ref,
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
v1 = [
  v0
];
return {
  "kind": "Fragment",
  "name": "issueDetailView_issue",
  "type": "Issue",
  "metadata": null,
  "argumentDefinitions": [
    {
      "kind": "LocalArgument",
      "name": "timelineCount",
      "type": "Int!",
      "defaultValue": null
    },
    {
      "kind": "LocalArgument",
      "name": "timelineCursor",
      "type": "String",
      "defaultValue": null
    }
  ],
  "selections": [
    {
      "kind": "ScalarField",
      "alias": null,
      "name": "__typename",
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
      "kind": "ScalarField",
      "alias": null,
      "name": "state",
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
      "name": "title",
      "args": null,
      "storageKey": null
    },
    {
      "kind": "ScalarField",
      "alias": null,
      "name": "bodyHTML",
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
        {
          "kind": "ScalarField",
          "alias": null,
          "name": "login",
          "args": null,
          "storageKey": null
        },
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
          "selections": v1
        },
        {
          "kind": "InlineFragment",
          "type": "User",
          "selections": v1
        }
      ]
    },
    {
      "kind": "FragmentSpread",
      "name": "issueTimelineController_issue",
      "args": [
        {
          "kind": "Variable",
          "name": "timelineCount",
          "variableName": "timelineCount",
          "type": null
        },
        {
          "kind": "Variable",
          "name": "timelineCursor",
          "variableName": "timelineCursor",
          "type": null
        }
      ]
    },
    v0,
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
    }
  ]
};
})();
// prettier-ignore
(node/*: any*/).hash = 'e1cf4b71a99cbade6149738c70451892';
module.exports = node;
