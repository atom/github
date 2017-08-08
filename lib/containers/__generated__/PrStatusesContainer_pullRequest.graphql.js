/**
 * @flow
 */

/* eslint-disable */

'use strict';

/*::
import type {ConcreteFragment} from 'relay-runtime';
export type PrStatusesContainer_pullRequest = {|
  +commits: {|
    +edges: ?$ReadOnlyArray<?{|
      +node: ?{|
        +commit: {|
          +status: ?{|
            +state: "EXPECTED" | "ERROR" | "FAILURE" | "PENDING" | "SUCCESS";
            +contexts: $ReadOnlyArray<{|
              +id: string;
              +state: "EXPECTED" | "ERROR" | "FAILURE" | "PENDING" | "SUCCESS";
            |}>;
          |};
        |};
      |};
    |}>;
  |};
|};
*/


const fragment /*: ConcreteFragment*/ = {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "PrStatusesContainer_pullRequest",
  "selections": [
    {
      "kind": "LinkedField",
      "alias": null,
      "args": [
        {
          "kind": "Literal",
          "name": "last",
          "value": 1,
          "type": "Int"
        }
      ],
      "concreteType": "PullRequestCommitConnection",
      "name": "commits",
      "plural": false,
      "selections": [
        {
          "kind": "LinkedField",
          "alias": null,
          "args": null,
          "concreteType": "PullRequestCommitEdge",
          "name": "edges",
          "plural": true,
          "selections": [
            {
              "kind": "LinkedField",
              "alias": null,
              "args": null,
              "concreteType": "PullRequestCommit",
              "name": "node",
              "plural": false,
              "selections": [
                {
                  "kind": "LinkedField",
                  "alias": null,
                  "args": null,
                  "concreteType": "Commit",
                  "name": "commit",
                  "plural": false,
                  "selections": [
                    {
                      "kind": "LinkedField",
                      "alias": null,
                      "args": null,
                      "concreteType": "Status",
                      "name": "status",
                      "plural": false,
                      "selections": [
                        {
                          "kind": "ScalarField",
                          "alias": null,
                          "args": null,
                          "name": "state",
                          "storageKey": null
                        },
                        {
                          "kind": "LinkedField",
                          "alias": null,
                          "args": null,
                          "concreteType": "StatusContext",
                          "name": "contexts",
                          "plural": true,
                          "selections": [
                            {
                              "kind": "ScalarField",
                              "alias": null,
                              "args": null,
                              "name": "id",
                              "storageKey": null
                            },
                            {
                              "kind": "ScalarField",
                              "alias": null,
                              "args": null,
                              "name": "state",
                              "storageKey": null
                            },
                            {
                              "kind": "FragmentSpread",
                              "name": "PrStatusContextContainer_context",
                              "args": null
                            }
                          ],
                          "storageKey": null
                        }
                      ],
                      "storageKey": null
                    }
                  ],
                  "storageKey": null
                }
              ],
              "storageKey": null
            }
          ],
          "storageKey": null
        }
      ],
      "storageKey": "commits{\"last\":1}"
    }
  ],
  "type": "PullRequest"
};

module.exports = fragment;
