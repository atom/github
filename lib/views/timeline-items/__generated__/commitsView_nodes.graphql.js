/**
 * @flow
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteFragment } from 'relay-runtime';
type commitView_commit$ref = any;
import type { FragmentReference } from "relay-runtime";
declare export opaque type commitsView_nodes$ref: FragmentReference;
export type commitsView_nodes = $ReadOnlyArray<{|
  +id: string,
  +author: ?{|
    +name: ?string,
    +user: ?{|
      +login: string
    |},
  |},
  +$fragmentRefs: commitView_commit$ref,
  +$refType: commitsView_nodes$ref,
|}>;
*/


const node/*: ConcreteFragment*/ = {
  "kind": "Fragment",
  "name": "commitsView_nodes",
  "type": "Commit",
  "metadata": {
    "plural": true
  },
  "argumentDefinitions": [],
  "selections": [
    {
      "kind": "ScalarField",
      "alias": null,
      "name": "id",
      "args": null,
      "storageKey": null
    },
    {
      "kind": "LinkedField",
      "alias": null,
      "name": "author",
      "storageKey": null,
      "args": null,
      "concreteType": "GitActor",
      "plural": false,
      "selections": [
        {
          "kind": "ScalarField",
          "alias": null,
          "name": "name",
          "args": null,
          "storageKey": null
        },
        {
          "kind": "LinkedField",
          "alias": null,
          "name": "user",
          "storageKey": null,
          "args": null,
          "concreteType": "User",
          "plural": false,
          "selections": [
            {
              "kind": "ScalarField",
              "alias": null,
              "name": "login",
              "args": null,
              "storageKey": null
            }
          ]
        }
      ]
    },
    {
      "kind": "FragmentSpread",
      "name": "commitView_commit",
      "args": null
    }
  ]
};
// prettier-ignore
(node/*: any*/).hash = 'e01f34cd74aa6d007049d5b421abe1ec';
module.exports = node;
