/**
 * @flow
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteFragment } from 'relay-runtime';
type commitContainer_item$ref = any;
import type { FragmentReference } from "relay-runtime";
declare export opaque type commitsContainer_nodes$ref: FragmentReference;
export type commitsContainer_nodes = $ReadOnlyArray<{|
  +id: string,
  +author: ?{|
    +name: ?string,
    +user: ?{|
      +login: string
    |},
  |},
  +$fragmentRefs: commitContainer_item$ref,
  +$refType: commitsContainer_nodes$ref,
|}>;
*/


const node/*: ConcreteFragment*/ = {
  "kind": "Fragment",
  "name": "commitsContainer_nodes",
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
      "name": "commitContainer_item",
      "args": null
    }
  ]
};
// prettier-ignore
(node/*: any*/).hash = '78a12a58f4b4be13e743e096ced0ea65';
module.exports = node;
