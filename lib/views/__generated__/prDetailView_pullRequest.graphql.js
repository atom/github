/**
 * @flow
 */

/* eslint-disable */

'use strict';

/*::
import type { ReaderFragment } from 'relay-runtime';
type emojiReactionsController_reactable$ref = any;
type prCommitsView_pullRequest$ref = any;
type prStatusesView_pullRequest$ref = any;
type prTimelineController_pullRequest$ref = any;
export type PullRequestState = "CLOSED" | "MERGED" | "OPEN" | "%future added value";
import type { FragmentReference } from "relay-runtime";
declare export opaque type prDetailView_pullRequest$ref: FragmentReference;
export type prDetailView_pullRequest = {|
  +id: string,
  +url: any,
  +isCrossRepository: boolean,
  +changedFiles: number,
  +state: PullRequestState,
  +number: number,
  +title: string,
  +bodyHTML: any,
  +baseRefName: string,
  +headRefName: string,
  +countedCommits: {|
    +totalCount: number
  |},
  +author: ?{|
    +login: string,
    +avatarUrl: any,
    +url: any,
  |},
  +__typename: "PullRequest",
  +$fragmentRefs: prCommitsView_pullRequest$ref & prStatusesView_pullRequest$ref & prTimelineController_pullRequest$ref & emojiReactionsController_reactable$ref,
  +$refType: prDetailView_pullRequest$ref,
|};
*/


const node/*: ReaderFragment*/ = (function(){
var v0 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "url",
  "args": null,
  "storageKey": null
};
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
    }
  ],
  "selections": [
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
      "name": "id",
      "args": null,
      "storageKey": null
    },
    (v0/*: any*/),
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
      "name": "__typename",
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
      "alias": "countedCommits",
      "name": "commits",
      "storageKey": null,
      "args": null,
      "concreteType": "PullRequestCommitConnection",
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
        (v0/*: any*/)
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
      "kind": "FragmentSpread",
      "name": "prStatusesView_pullRequest",
      "args": null
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
    {
      "kind": "FragmentSpread",
      "name": "emojiReactionsController_reactable",
      "args": null
    }
  ]
};
})();
// prettier-ignore
(node/*: any*/).hash = '3fc00d1cf0c2c3906259c3dbd88952e6';
module.exports = node;
