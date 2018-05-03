/**
 * @flow
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteFragment } from 'relay-runtime';
type prStatusContextContainer_context$ref = any;
export type StatusState = "ERROR" | "EXPECTED" | "FAILURE" | "PENDING" | "SUCCESS" | "%future added value";
import type { FragmentReference } from "relay-runtime";
declare export opaque type prStatusesContainer_pullRequest$ref: FragmentReference;
export type prStatusesContainer_pullRequest = {|
  +id: string,
  +commits: {|
    +edges: ?$ReadOnlyArray<?{|
      +node: ?{|
        +commit: {|
          +status: ?{|
            +state: StatusState,
            +contexts: $ReadOnlyArray<{|
              +id: string,
              +state: StatusState,
              +$fragmentRefs: prStatusContextContainer_context$ref,
            |}>,
          |}
        |}
      |}
    |}>
  |},
  +$refType: prStatusesContainer_pullRequest$ref,
|};
*/


const node/*: ConcreteFragment*/ = (function(){
var v0 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "id",
  "args": null,
  "storageKey": null
},
v1 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "state",
  "args": null,
  "storageKey": null
};
return {
  "kind": "Fragment",
  "name": "prStatusesContainer_pullRequest",
  "type": "PullRequest",
  "metadata": null,
  "argumentDefinitions": [],
  "selections": [
    v0,
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
          "name": "edges",
          "storageKey": null,
          "args": null,
          "concreteType": "PullRequestCommitEdge",
          "plural": true,
          "selections": [
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
                      "name": "status",
                      "storageKey": null,
                      "args": null,
                      "concreteType": "Status",
                      "plural": false,
                      "selections": [
                        v1,
                        {
                          "kind": "LinkedField",
                          "alias": null,
                          "name": "contexts",
                          "storageKey": null,
                          "args": null,
                          "concreteType": "StatusContext",
                          "plural": true,
                          "selections": [
                            v0,
                            v1,
                            {
                              "kind": "FragmentSpread",
                              "name": "prStatusContextContainer_context",
                              "args": null
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
})();
// prettier-ignore
(node/*: any*/).hash = '5140fedecb47f62c0adb19a2543aa6d6';
module.exports = node;
