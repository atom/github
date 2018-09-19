/**
 * @flow
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteFragment } from 'relay-runtime';
import type { FragmentReference } from "relay-runtime";
declare export opaque type prCommitsView_pullRequest$ref: FragmentReference;
export type prCommitsView_pullRequest = {|
  +commits: {|
    +pageInfo: {|
      +endCursor: ?string,
      +hasNextPage: boolean,
    |},
    +edges: ?$ReadOnlyArray<?{|
      +cursor: string,
      +node: ?{|
        +commit: {|
          +committer: ?{|
            +avatarUrl: any,
            +name: ?string,
            +date: ?any,
          |},
          +messageHeadline: string,
          +messageBody: string,
          +abbreviatedOid: string,
          +url: any,
        |}
      |},
    |}>,
  |},
  +$refType: prCommitsView_pullRequest$ref,
|};
*/


const node/*: ConcreteFragment*/ = {
  "kind": "Fragment",
  "name": "prCommitsView_pullRequest",
  "type": "PullRequest",
  "metadata": {
    "connection": [
      {
        "count": "commitCount",
        "cursor": "commitCursor",
        "direction": "forward",
        "path": [
          "commits"
        ]
      }
    ]
  },
  "argumentDefinitions": [
    {
      "kind": "LocalArgument",
      "name": "commitCount",
      "type": "Int!",
      "defaultValue": 100
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
      "kind": "LinkedField",
      "alias": "commits",
      "name": "__prCommitsView_commits_connection",
      "storageKey": null,
      "args": null,
      "concreteType": "PullRequestCommitConnection",
      "plural": false,
      "selections": [
        {
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
              "name": "endCursor",
              "args": null,
              "storageKey": null
            },
            {
              "kind": "ScalarField",
              "alias": null,
              "name": "hasNextPage",
              "args": null,
              "storageKey": null
            }
          ]
        },
        {
          "kind": "LinkedField",
          "alias": null,
          "name": "edges",
          "storageKey": null,
          "args": null,
          "concreteType": "PullRequestCommitEdge",
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
              "concreteType": "PullRequestCommit",
              "plural": false,
              "selections": [
                {
                  "kind": "LinkedField",
                  "alias": null,
                  "name": "commit",
                  "storageKey": null,
                  "args": null,
                  "concreteType": "Commit",
                  "plural": false,
                  "selections": [
                    {
                      "kind": "LinkedField",
                      "alias": null,
                      "name": "committer",
                      "storageKey": null,
                      "args": null,
                      "concreteType": "GitActor",
                      "plural": false,
                      "selections": [
                        {
                          "kind": "ScalarField",
                          "alias": null,
                          "name": "avatarUrl",
                          "args": null,
                          "storageKey": null
                        },
                        {
                          "kind": "ScalarField",
                          "alias": null,
                          "name": "name",
                          "args": null,
                          "storageKey": null
                        },
                        {
                          "kind": "ScalarField",
                          "alias": null,
                          "name": "date",
                          "args": null,
                          "storageKey": null
                        }
                      ]
                    },
                    {
                      "kind": "ScalarField",
                      "alias": null,
                      "name": "messageHeadline",
                      "args": null,
                      "storageKey": null
                    },
                    {
                      "kind": "ScalarField",
                      "alias": null,
                      "name": "messageBody",
                      "args": null,
                      "storageKey": null
                    },
                    {
                      "kind": "ScalarField",
                      "alias": null,
                      "name": "abbreviatedOid",
                      "args": null,
                      "storageKey": null
                    },
                    {
                      "kind": "ScalarField",
                      "alias": null,
                      "name": "url",
                      "args": null,
                      "storageKey": null
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
// prettier-ignore
(node/*: any*/).hash = 'e1f5cf9ada569bc89b19f92cda93153f';
module.exports = node;
