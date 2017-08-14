/**
 * @flow
 */

/* eslint-disable */

'use strict';

/*::
import type {ConcreteFragment} from 'relay-runtime';
export type PrSelectionByUrlContainer_resource = {|
  +__typename: string;
|};
*/


const fragment /*: ConcreteFragment*/ = {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "PrSelectionByUrlContainer_resource",
  "selections": [
    {
      "kind": "ScalarField",
      "alias": null,
      "args": null,
      "name": "__typename",
      "storageKey": null
    },
    {
      "kind": "InlineFragment",
      "type": "PullRequest",
      "selections": [
        {
          "kind": "FragmentSpread",
          "name": "PrInfoContainer_pullRequest",
          "args": null
        }
      ]
    }
  ],
  "type": "UniformResourceLocatable"
};

module.exports = fragment;
