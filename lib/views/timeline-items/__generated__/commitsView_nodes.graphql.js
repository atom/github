/**
 * @flow
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteFragment } from 'relay-runtime';
type commitView_item$ref = any;
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
  +$fragmentRefs: commitView_item$ref,
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
      "name": "commitView_item",
      "args": null
    }
  ]
};
// prettier-ignore
(node/*: any*/).hash = 'd0a17f07d02df54341e950344ec41a7f';
module.exports = node;
