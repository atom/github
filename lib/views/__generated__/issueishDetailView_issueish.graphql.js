/**
 * @flow
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteFragment } from 'relay-runtime';
type issueTimelineController_issue$ref = any;
type prCommitsView_pullRequest$ref = any;
type prStatusesView_pullRequest$ref = any;
type prTimelineController_pullRequest$ref = any;
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
  +isCrossRepository?: boolean,
  +changedFiles?: number,
  +countedCommits?: {|
    +totalCount: number
  |},
  +baseRefName?: string,
  +headRefName?: string,
  +$fragmentRefs: issueTimelineController_issue$ref & prCommitsView_pullRequest$ref & prStatusesView_pullRequest$ref & prTimelineController_pullRequest$ref,
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
v1 = [
  {
    "kind": "ScalarField",
    "alias": null,
    "name": "totalCount",
    "args": null,
    "storageKey": null
  }
],
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
  "name": "state",
  "args": null,
  "storageKey": null
},
v4 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "title",
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
v6 = [
  v0
],
v7 = {
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
      "selections": v6
    },
    {
      "kind": "InlineFragment",
      "type": "User",
      "selections": v6
    }
  ]
},
v8 = [
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
      "type": "Int!",
      "defaultValue": null
    },
    {
      "kind": "LocalArgument",
      "name": "timelineCursor",
      "type": "String",
      "defaultValue": null
    },
    {
      "kind": "LocalArgument",
      "name": "commitCount",
      "type": "Int!",
      "defaultValue": null
    },
    {
      "kind": "LocalArgument",
      "name": "commitCursor",
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
          "selections": v1
        }
      ]
    },
    {
      "kind": "InlineFragment",
      "type": "PullRequest",
      "selections": [
        v2,
        {
          "kind": "ScalarField",
          "alias": null,
          "name": "isCrossRepository",
          "args": null,
          "storageKey": null
        },
        {
          "kind": "FragmentSpread",
          "name": "prCommitsView_pullRequest",
          "args": [
            {
              "kind": "Variable",
              "name": "commitCount",
              "variableName": "commitCount",
              "type": null
            },
            {
              "kind": "Variable",
              "name": "commitCursor",
              "variableName": "commitCursor",
              "type": null
            }
          ]
        },
        {
          "kind": "LinkedField",
          "alias": "countedCommits",
          "name": "commits",
          "storageKey": null,
          "args": null,
          "concreteType": "PullRequestCommitConnection",
          "plural": false,
          "selections": v1
        },
        {
          "kind": "FragmentSpread",
          "name": "prStatusesView_pullRequest",
          "args": null
        },
        v3,
        {
          "kind": "ScalarField",
          "alias": null,
          "name": "changedFiles",
          "args": null,
          "storageKey": null
        },
        v4,
        v5,
        {
          "kind": "ScalarField",
          "alias": null,
          "name": "baseRefName",
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
        v7,
        {
          "kind": "FragmentSpread",
          "name": "prTimelineController_pullRequest",
          "args": v8
        }
      ]
    },
    {
      "kind": "InlineFragment",
      "type": "Issue",
      "selections": [
        v3,
        v2,
        v4,
        v5,
        v7,
        {
          "kind": "FragmentSpread",
          "name": "issueTimelineController_issue",
          "args": v8
        }
      ]
    }
  ]
};
})();
// prettier-ignore
(node/*: any*/).hash = 'c24859a915333972a63ccb57c0c937f0';
module.exports = node;
