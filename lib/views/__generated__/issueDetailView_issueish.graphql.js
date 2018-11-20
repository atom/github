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
declare export opaque type issueDetailView_issueish$ref: FragmentReference;
export type issueDetailView_issueish = {|
  +__typename: string,
  +id?: string,
  +url?: any,
  +reactionGroups?: ?$ReadOnlyArray<{|
    +content: ReactionContent,
    +users: {|
      +totalCount: number
    |},
  |}>,
  +state?: IssueState,
  +number?: number,
  +title?: string,
  +bodyHTML?: any,
  +author?: ?{|
    +login: string,
    +avatarUrl: any,
    +url?: any,
  |},
  +$fragmentRefs: issueTimelineController_issue$ref,
  +$refType: issueDetailView_issueish$ref,
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
  "name": "issueDetailView_issueish",
  "type": "IssueOrPullRequest",
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
    },
    {
      "kind": "InlineFragment",
      "type": "Issue",
      "selections": [
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
        }
      ]
    }
  ]
};
})();
// prettier-ignore
(node/*: any*/).hash = 'e706bcd2c9ec8c5c57f26c39e38d8159';
module.exports = node;
