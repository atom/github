/**
 * @flow
 */

/* eslint-disable */

'use strict';

/*::
import type { ReaderFragment } from 'relay-runtime';
type prCommitsView_pullRequest$ref = any;
type prReviewsContainer_pullRequest$ref = any;
type prStatusesView_pullRequest$ref = any;
type prTimelineController_pullRequest$ref = any;
export type PullRequestState = "CLOSED" | "MERGED" | "OPEN" | "%future added value";
export type ReactionContent = "CONFUSED" | "HEART" | "HOORAY" | "LAUGH" | "THUMBS_DOWN" | "THUMBS_UP" | "%future added value";
import type { FragmentReference } from "relay-runtime";
declare export opaque type prDetailView_pullRequest$ref: FragmentReference;
export type prDetailView_pullRequest = {|
  +id?: string,
  +isCrossRepository: boolean,
  +changedFiles: number,
  +countedCommits: {|
    +totalCount: number
  |},
  +state: PullRequestState,
  +number: number,
  +title: string,
  +bodyHTML: any,
  +baseRefName: string,
  +headRefName: string,
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
  +__typename: "PullRequest",
  +$fragmentRefs: prReviewsContainer_pullRequest$ref & prCommitsView_pullRequest$ref & prStatusesView_pullRequest$ref & prTimelineController_pullRequest$ref,
  +$refType: prDetailView_pullRequest$ref,
|};
*/


const node/*: ReaderFragment*/ = (function(){
var v0 = [
  {
    "kind": "ScalarField",
    "alias": null,
    "name": "totalCount",
    "args": null,
    "storageKey": null
  }
],
v1 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "url",
  "args": null,
  "storageKey": null
},
v2 = [
  (v1/*: any*/)
];
return {
  "kind": "Fragment",
  "name": "prDetailView_pullRequest",
  "type": "PullRequest",
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
  "selections": [
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
      "name": "__typename",
      "args": null,
      "storageKey": null
    },
    {
      "kind": "ScalarField",
      "alias": null,
      "name": "isCrossRepository",
      "args": null,
      "storageKey": null
    },
    {
      "kind": "ScalarField",
      "alias": null,
      "name": "changedFiles",
      "args": null,
      "storageKey": null
    },
    {
      "kind": "FragmentSpread",
      "name": "prReviewsContainer_pullRequest",
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
        }
      ]
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
      "selections": (v0/*: any*/)
    },
    {
      "kind": "FragmentSpread",
      "name": "prStatusesView_pullRequest",
      "args": null
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
          "selections": (v2/*: any*/)
        },
        {
          "kind": "InlineFragment",
          "type": "User",
          "selections": (v2/*: any*/)
        }
      ]
    },
    {
      "kind": "FragmentSpread",
      "name": "prTimelineController_pullRequest",
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
    (v1/*: any*/),
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
          "selections": (v0/*: any*/)
        }
      ]
    }
  ]
};
})();
// prettier-ignore
(node/*: any*/).hash = 'e3868f3180aae27226fe92ba6f444412';
module.exports = node;
