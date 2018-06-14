/**
 * @flow
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteFragment } from 'relay-runtime';
export type StatusState = "ERROR" | "EXPECTED" | "FAILURE" | "PENDING" | "SUCCESS" | "%future added value";
import type { FragmentReference } from "relay-runtime";
declare export opaque type issueishListController_results$ref: FragmentReference;
export type issueishListController_results = {|
  +issueCount: number,
  +nodes: ?$ReadOnlyArray<?{|
    +number?: number,
    +title?: string,
    +url?: any,
    +author?: ?{|
      +login: string,
      +avatarUrl: any,
    |},
    +createdAt?: any,
    +headRefName?: string,
    +headRepository?: ?{|
      +nameWithOwner: string
    |},
    +commits?: {|
      +nodes: ?$ReadOnlyArray<?{|
        +commit: {|
          +status: ?{|
            +contexts: $ReadOnlyArray<{|
              +state: StatusState
            |}>
          |}
        |}
      |}>
    |},
  |}>,
  +$refType: issueishListController_results$ref,
|};
*/


const node/*: ConcreteFragment*/ = {
  "kind": "Fragment",
  "name": "issueishListController_results",
  "type": "SearchResultItemConnection",
  "metadata": null,
  "argumentDefinitions": [],
  "selections": [
    {
      "kind": "ScalarField",
      "alias": null,
      "name": "issueCount",
      "args": null,
      "storageKey": null
    },
    {
      "kind": "LinkedField",
      "alias": null,
      "name": "nodes",
      "storageKey": null,
      "args": null,
      "concreteType": null,
      "plural": true,
      "selections": [
        {
          "kind": "InlineFragment",
          "type": "PullRequest",
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
              "name": "title",
              "args": null,
              "storageKey": null
            },
            {
              "kind": "ScalarField",
              "alias": null,
              "name": "url",
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
                }
              ]
            },
            {
              "kind": "ScalarField",
              "alias": null,
              "name": "createdAt",
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
              "name": "headRepository",
              "storageKey": null,
              "args": null,
              "concreteType": "Repository",
              "plural": false,
              "selections": [
                {
                  "kind": "ScalarField",
                  "alias": null,
                  "name": "nameWithOwner",
                  "args": null,
                  "storageKey": null
                }
              ]
            },
            {
              "kind": "LinkedField",
              "alias": null,
              "name": "commits",
              "storageKey": "commits(last:1)",
              "args": [
                {
                  "kind": "Literal",
                  "name": "last",
                  "value": 1,
                  "type": "Int"
                }
              ],
              "concreteType": "PullRequestCommitConnection",
              "plural": false,
              "selections": [
                {
                  "kind": "LinkedField",
                  "alias": null,
                  "name": "nodes",
                  "storageKey": null,
                  "args": null,
                  "concreteType": "PullRequestCommit",
                  "plural": true,
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
                          "name": "status",
                          "storageKey": null,
                          "args": null,
                          "concreteType": "Status",
                          "plural": false,
                          "selections": [
                            {
                              "kind": "LinkedField",
                              "alias": null,
                              "name": "contexts",
                              "storageKey": null,
                              "args": null,
                              "concreteType": "StatusContext",
                              "plural": true,
                              "selections": [
                                {
                                  "kind": "ScalarField",
                                  "alias": null,
                                  "name": "state",
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
(node/*: any*/).hash = '7ab450dd0df53e3e0e9a79563fdcd9ed';
module.exports = node;
