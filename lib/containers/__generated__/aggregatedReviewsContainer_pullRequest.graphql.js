/**
 * @flow
 */

/* eslint-disable */

'use strict';

/*::
import type { ReaderFragment } from 'relay-runtime';
type reviewSummariesAccumulator_pullRequest$ref = any;
type reviewThreadsAccumulator_pullRequest$ref = any;
import type { FragmentReference } from "relay-runtime";
declare export opaque type aggregatedReviewsContainer_pullRequest$ref: FragmentReference;
export type aggregatedReviewsContainer_pullRequest = {|
  +$fragmentRefs: reviewSummariesAccumulator_pullRequest$ref & reviewThreadsAccumulator_pullRequest$ref,
  +$refType: aggregatedReviewsContainer_pullRequest$ref,
|};
*/


const node/*: ReaderFragment*/ = {
  "kind": "Fragment",
  "name": "aggregatedReviewsContainer_pullRequest",
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
      "kind": "FragmentSpread",
      "name": "reviewSummariesAccumulator_pullRequest",
      "args": [
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
        }
      ]
    },
    {
      "kind": "FragmentSpread",
      "name": "reviewThreadsAccumulator_pullRequest",
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
(node/*: any*/).hash = 'a4de3b7675b8536de6b2b94d22339a8e';
module.exports = node;
