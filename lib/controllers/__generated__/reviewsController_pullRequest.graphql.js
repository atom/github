/**
 * @flow
 */

/* eslint-disable */

'use strict';

/*::
import type { ReaderFragment } from 'relay-runtime';
type aggregatedReviewsContainer_pullRequest$ref = any;
type prCheckoutController_pullRequest$ref = any;
import type { FragmentReference } from "relay-runtime";
declare export opaque type reviewsController_pullRequest$ref: FragmentReference;
export type reviewsController_pullRequest = {|
  +id: string,
  +headRefOid: any,
  +$fragmentRefs: prCheckoutController_pullRequest$ref & aggregatedReviewsContainer_pullRequest$ref,
  +$refType: reviewsController_pullRequest$ref,
|};
*/


const node/*: ReaderFragment*/ = {
  "kind": "Fragment",
  "name": "reviewsController_pullRequest",
  "type": "PullRequest",
  "metadata": null,
  "argumentDefinitions": [
    {
      "kind": "LocalArgument",
      "name": "reviewCount",
      "type": "Int!",
      "defaultValue": null
    },
    {
      "kind": "LocalArgument",
      "name": "reviewCursor",
      "type": "String",
      "defaultValue": null
    },
    {
      "kind": "LocalArgument",
      "name": "threadCount",
      "type": "Int!",
      "defaultValue": null
    },
    {
      "kind": "LocalArgument",
      "name": "threadCursor",
      "type": "String",
      "defaultValue": null
    },
    {
      "kind": "LocalArgument",
      "name": "commentCount",
      "type": "Int!",
      "defaultValue": null
    },
    {
      "kind": "LocalArgument",
      "name": "commentCursor",
      "type": "String",
      "defaultValue": null
    }
  ],
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
      "name": "headRefOid",
      "args": null,
      "storageKey": null
    },
    {
      "kind": "FragmentSpread",
      "name": "prCheckoutController_pullRequest",
      "args": null
    },
    {
      "kind": "FragmentSpread",
      "name": "aggregatedReviewsContainer_pullRequest",
      "args": [
        {
          "kind": "Variable",
          "name": "commentCount",
          "variableName": "commentCount",
          "type": null
        },
        {
          "kind": "Variable",
          "name": "commentCursor",
          "variableName": "commentCursor",
          "type": null
        },
        {
          "kind": "Variable",
          "name": "reviewCount",
          "variableName": "reviewCount",
          "type": null
        },
        {
          "kind": "Variable",
          "name": "reviewCursor",
          "variableName": "reviewCursor",
          "type": null
        },
        {
          "kind": "Variable",
          "name": "threadCount",
          "variableName": "threadCount",
          "type": null
        },
        {
          "kind": "Variable",
          "name": "threadCursor",
          "variableName": "threadCursor",
          "type": null
        }
      ]
    }
  ]
};
// prettier-ignore
(node/*: any*/).hash = '5e7742df7d173fd478e610225c5915a4';
module.exports = node;
