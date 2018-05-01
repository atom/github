/**
 * @flow
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteFragment } from 'relay-runtime';
type crossReferencedEventContainer_item$ref = any;
import type { FragmentReference } from "relay-runtime";
declare export opaque type crossReferencedEventsContainer_nodes$ref: FragmentReference;
export type crossReferencedEventsContainer_nodes = $ReadOnlyArray<{|
  +id: string,
  +referencedAt: any,
  +isCrossRepository: boolean,
  +actor: ?{|
    +login: string,
    +avatarUrl: any,
  |},
  +source: {|
    +__typename: string,
    +repository?: {|
      +name: string,
      +owner: {|
        +login: string
      |},
    |},
  |},
  +$fragmentRefs: crossReferencedEventContainer_item$ref,
  +$refType: crossReferencedEventsContainer_nodes$ref,
|}>;
*/


const node/*: ConcreteFragment*/ = (function(){
var v0 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "login",
  "args": null,
  "storageKey": null
};
return {
  "kind": "Fragment",
  "name": "crossReferencedEventsContainer_nodes",
  "type": "CrossReferencedEvent",
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
      "kind": "ScalarField",
      "alias": null,
      "name": "referencedAt",
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
      "kind": "LinkedField",
      "alias": null,
      "name": "actor",
      "storageKey": null,
      "args": null,
      "concreteType": null,
      "plural": false,
      "selections": [
        v0,
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
      "kind": "LinkedField",
      "alias": null,
      "name": "source",
      "storageKey": null,
      "args": null,
      "concreteType": null,
      "plural": false,
      "selections": [
        {
          "kind": "ScalarField",
          "alias": null,
          "name": "__typename",
          "args": null,
          "storageKey": null
        },
        {
          "kind": "LinkedField",
          "alias": null,
          "name": "repository",
          "storageKey": null,
          "args": null,
          "concreteType": "Repository",
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
              "name": "owner",
              "storageKey": null,
              "args": null,
              "concreteType": null,
              "plural": false,
              "selections": [
                v0
              ]
            }
          ]
        }
      ]
    },
    {
      "kind": "FragmentSpread",
      "name": "crossReferencedEventContainer_item",
      "args": null
    }
  ]
};
})();
// prettier-ignore
(node/*: any*/).hash = 'd431ba25343ab1bf40cd18887625de30';
module.exports = node;
