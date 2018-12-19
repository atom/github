/**
 * @flow
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteFragment } from 'relay-runtime';
type prCommitsView_pullRequest$ref = any;
type prStatusesView_pullRequest$ref = any;
type prTimelineController_pullRequest$ref = any;
export type PullRequestReviewState = "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED" | "DISMISSED" | "PENDING" | "%future added value";
export type PullRequestState = "CLOSED" | "MERGED" | "OPEN" | "%future added value";
export type ReactionContent = "CONFUSED" | "HEART" | "HOORAY" | "LAUGH" | "THUMBS_DOWN" | "THUMBS_UP" | "%future added value";
import type { FragmentReference } from "relay-runtime";
declare export opaque type prDetailView_pullRequest$ref: FragmentReference;
export type prDetailView_pullRequest = {|
  +id?: string,
  +isCrossRepository: boolean,
  +changedFiles: number,
  +comments: {|
    +totalCount: number
  |},
  +reviews: ?{|
    +pageInfo: {|
      +hasNextPage: boolean,
      +endCursor: ?string,
    |},
    +nodes: ?$ReadOnlyArray<?{|
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
          +pullRequestId: {|
            +number: number
          |},
          +databaseId: ?number,
          +login: ?{|
            +login: string
          |},
          +author: ?{|
            +avatarUrl: any
          |},
          +body: string,
          +path: string,
          +commitSha: {|
            +oid: any
          |},
          +diffHunk: string,
          +position: ?number,
          +originalPosition: number,
          +originalCommitId: ?{|
            +oid: any
          |},
          +replyTo: ?{|
            +id: string
          |},
          +createdAt: any,
          +url: any,
        |}>,
      |},
    |}>,
  |},
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
  +$fragmentRefs: prCommitsView_pullRequest$ref & prStatusesView_pullRequest$ref & prTimelineController_pullRequest$ref,
  +$refType: prDetailView_pullRequest$ref,
|};
*/


const node/*: ConcreteFragment*/ = (function(){
var v0 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "state",
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
v2 = [
  {
    "kind": "Literal",
    "name": "first",
    "value": 100,
    "type": "Int"
  }
],
v3 = {
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
v4 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "id",
  "args": null,
  "storageKey": null
},
v5 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "body",
  "args": null,
  "storageKey": null
},
v6 = [
  {
    "kind": "ScalarField",
    "alias": null,
    "name": "oid",
    "args": null,
    "storageKey": null
  }
],
v7 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "login",
  "args": null,
  "storageKey": null
},
v8 = {
  "kind": "LinkedField",
  "alias": "login",
  "name": "author",
  "storageKey": null,
  "args": null,
  "concreteType": null,
  "plural": false,
  "selections": [
    v7
  ]
},
v9 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "avatarUrl",
  "args": null,
  "storageKey": null
},
v10 = {
  "kind": "LinkedField",
  "alias": null,
  "name": "author",
  "storageKey": null,
  "args": null,
  "concreteType": null,
  "plural": false,
  "selections": [
    v9
  ]
},
v11 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "number",
  "args": null,
  "storageKey": null
},
v12 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "url",
  "args": null,
  "storageKey": null
},
v13 = [
  v12
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
    v0,
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
      "kind": "LinkedField",
      "alias": null,
      "name": "comments",
      "storageKey": null,
      "args": null,
      "concreteType": "IssueCommentConnection",
      "plural": false,
      "selections": v1
    },
    {
      "kind": "LinkedField",
      "alias": null,
      "name": "reviews",
      "storageKey": "reviews(first:100)",
      "args": v2,
      "concreteType": "PullRequestReviewConnection",
      "plural": false,
      "selections": [
        v3,
        {
          "kind": "LinkedField",
          "alias": null,
          "name": "nodes",
          "storageKey": null,
          "args": null,
          "concreteType": "PullRequestReview",
          "plural": true,
          "selections": [
            v4,
            v5,
            {
              "kind": "LinkedField",
              "alias": "commitId",
              "name": "commit",
              "storageKey": null,
              "args": null,
              "concreteType": "Commit",
              "plural": false,
              "selections": v6
            },
            v0,
            {
              "kind": "ScalarField",
              "alias": null,
              "name": "submittedAt",
              "args": null,
              "storageKey": null
            },
            v8,
            v10,
            {
              "kind": "LinkedField",
              "alias": null,
              "name": "comments",
              "storageKey": "comments(first:100)",
              "args": v2,
              "concreteType": "PullRequestReviewCommentConnection",
              "plural": false,
              "selections": [
                v3,
                {
                  "kind": "LinkedField",
                  "alias": null,
                  "name": "nodes",
                  "storageKey": null,
                  "args": null,
                  "concreteType": "PullRequestReviewComment",
                  "plural": true,
                  "selections": [
                    {
                      "kind": "LinkedField",
                      "alias": "commitSha",
                      "name": "commit",
                      "storageKey": null,
                      "args": null,
                      "concreteType": "Commit",
                      "plural": false,
                      "selections": v6
                    },
                    v4,
                    {
                      "kind": "ScalarField",
                      "alias": null,
                      "name": "databaseId",
                      "args": null,
                      "storageKey": null
                    },
                    v8,
                    v10,
                    v5,
                    {
                      "kind": "ScalarField",
                      "alias": null,
                      "name": "path",
                      "args": null,
                      "storageKey": null
                    },
                    {
                      "kind": "LinkedField",
                      "alias": "pullRequestId",
                      "name": "pullRequest",
                      "storageKey": null,
                      "args": null,
                      "concreteType": "PullRequest",
                      "plural": false,
                      "selections": [
                        v11
                      ]
                    },
                    {
                      "kind": "ScalarField",
                      "alias": null,
                      "name": "diffHunk",
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
                      "kind": "ScalarField",
                      "alias": null,
                      "name": "originalPosition",
                      "args": null,
                      "storageKey": null
                    },
                    {
                      "kind": "LinkedField",
                      "alias": "originalCommitId",
                      "name": "originalCommit",
                      "storageKey": null,
                      "args": null,
                      "concreteType": "Commit",
                      "plural": false,
                      "selections": v6
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
                        v4
                      ]
                    },
                    {
                      "kind": "ScalarField",
                      "alias": null,
                      "name": "createdAt",
                      "args": null,
                      "storageKey": null
                    },
                    v12
                  ]
                }
              ]
            }
          ]
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
      "selections": v1
    },
    {
      "kind": "FragmentSpread",
      "name": "prStatusesView_pullRequest",
      "args": null
    },
    v4,
    v11,
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
        v7,
        v9,
        {
          "kind": "InlineFragment",
          "type": "Bot",
          "selections": v13
        },
        {
          "kind": "InlineFragment",
          "type": "User",
          "selections": v13
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
    v12,
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
    }
  ]
};
})();
// prettier-ignore
(node/*: any*/).hash = '6b79c21bb0d8e16f2d4c094d0fd055c8';
module.exports = node;
