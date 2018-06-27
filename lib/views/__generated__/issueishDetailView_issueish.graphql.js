/**
 * @flow
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteFragment } from 'relay-runtime';
type issueTimelineContainer_issue$ref = any;
type prStatusesContainer_pullRequest$ref = any;
type prTimelineContainer_pullRequest$ref = any;
export type IssueState = "CLOSED" | "OPEN" | "%future added value";
export type PullRequestState = "CLOSED" | "MERGED" | "OPEN" | "%future added value";
export type ReactionContent = "CONFUSED" | "HEART" | "HOORAY" | "LAUGH" | "THUMBS_DOWN" | "THUMBS_UP" | "%future added value";
import type { FragmentReference } from "relay-runtime";
declare export opaque type issueishDetailView_issueish$ref: FragmentReference;
export type issueishDetailView_issueish = {|
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
  +$fragmentRefs: issueTimelineContainer_issue$ref & prStatusesContainer_pullRequest$ref & prTimelineContainer_pullRequest$ref,
  +$refType: issueishDetailView_issueish$ref,
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
  "name": "state",
  "args": null,
  "storageKey": null
},
v2 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "number",
  "args": null,
  "storageKey": null
},
v3 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "title",
  "args": null,
  "storageKey": null
},
v4 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "bodyHTML",
  "args": null,
  "storageKey": null
},
v5 = [
  v0
],
v6 = {
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
      "selections": v5
    },
    {
      "kind": "InlineFragment",
      "type": "User",
      "selections": v5
    }
  ]
},
v7 = [
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
];
return {
  "kind": "Fragment",
  "name": "issueishDetailView_issueish",
  "type": "IssueOrPullRequest",
  "metadata": null,
  "argumentDefinitions": [
    {
      "kind": "LocalArgument",
      "name": "timelineCount",
      "type": "Int",
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
      "type": "PullRequest",
      "selections": [
        {
          "kind": "FragmentSpread",
          "name": "prStatusesContainer_pullRequest",
          "args": null
        },
        v1,
        v2,
        v3,
        v4,
        v6,
        {
          "kind": "FragmentSpread",
          "name": "prTimelineContainer_pullRequest",
          "args": v7
        }
      ]
    },
    {
      "kind": "InlineFragment",
      "type": "Issue",
      "selections": [
        v1,
        v2,
        v3,
        v4,
        v6,
        {
          "kind": "FragmentSpread",
          "name": "issueTimelineContainer_issue",
          "args": v7
        }
      ]
    }
  ]
};
})();
// prettier-ignore
(node/*: any*/).hash = '4030ff81df8e392b072a39440744e2bb';
module.exports = node;
