/**
 * @flow
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteFragment } from 'relay-runtime';
type prInfoContainer_pullRequest$ref = any;
import type { FragmentReference } from "relay-runtime";
declare export opaque type prSelectionByUrlContainer_resource$ref: FragmentReference;
export type prSelectionByUrlContainer_resource = {|
  +__typename: "PullRequest",
  +$fragmentRefs: prInfoContainer_pullRequest$ref,
  +$refType: prSelectionByUrlContainer_resource$ref,
|} | {|
  // This will never be '%other', but we need some
  // value in case none of the concrete values match.
  +__typename: "%other",
  +$refType: prSelectionByUrlContainer_resource$ref,
|};
*/


const node/*: ConcreteFragment*/ = {
  "kind": "Fragment",
  "name": "prSelectionByUrlContainer_resource",
  "type": "UniformResourceLocatable",
  "metadata": null,
  "argumentDefinitions": [],
  "selections": [
    {
      "kind": "ScalarField",
      "alias": null,
      "name": "__typename",
      "args": null,
      "storageKey": null
    },
    {
      "kind": "InlineFragment",
      "type": "PullRequest",
      "selections": [
        {
          "kind": "FragmentSpread",
          "name": "prInfoContainer_pullRequest",
          "args": null
        }
      ]
    }
  ]
};
// prettier-ignore
(node/*: any*/).hash = '40bb7b845477903ff9a23d9ea731c3c6';
module.exports = node;
