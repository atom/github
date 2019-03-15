/**
 * @flow
 */

/* eslint-disable */

'use strict';

/*::
import type { ReaderFragment } from 'relay-runtime';
type aggregatedReviewsContainer_pullRequest$ref = any;
import type { FragmentReference } from "relay-runtime";
declare export opaque type commentDecorationsController_results$ref: FragmentReference;
export type commentDecorationsController_results = $ReadOnlyArray<{|
  +number: number,
  +author: ?{|
    +login: string,
    +avatarUrl: any,
  |},
  +createdAt: any,
  +headRefName: string,
  +headRepository: ?{|
    +name: string,
    +owner: {|
      +login: string
    |},
  |},
  +repository: {|
    +id: string,
    +owner: {|
      +login: string
    |},
  |},
  +$fragmentRefs: aggregatedReviewsContainer_pullRequest$ref,
  +$refType: commentDecorationsController_results$ref,
|}>;
*/


const node/*: ReaderFragment*/ = (function(){
var v0 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "login",
  "args": null,
  "storageKey": null
},
v1 = {
  "kind": "LinkedField",
  "alias": null,
  "name": "owner",
  "storageKey": null,
  "args": null,
  "concreteType": null,
  "plural": false,
  "selections": [
    (v0/*: any*/)
  ]
};
return {
  "kind": "Fragment",
  "name": "commentDecorationsController_results",
  "type": "PullRequest",
  "metadata": {
    "plural": true
  },
  "argumentDefinitions": [
    {
      "kind": "RootArgument",
      "name": "reviewCount",
      "type": null
    },
    {
      "kind": "RootArgument",
      "name": "reviewCursor",
      "type": null
    },
    {
      "kind": "RootArgument",
      "name": "threadCount",
      "type": null
    },
    {
      "kind": "RootArgument",
      "name": "threadCursor",
      "type": null
    },
    {
      "kind": "RootArgument",
      "name": "commentCount",
      "type": null
    },
    {
      "kind": "RootArgument",
      "name": "commentCursor",
      "type": null
    }
  ],
  "selections": [
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
    },
    {
      "kind": "ScalarField",
      "alias": null,
      "name": "number",
      "args": null,
      "storageKey": null
    },
    {
      "kind": "LinkedField",
      "alias": null,
      "name": "author",
      "storageKey": null,
      "args": null,
      "concreteType": null,
      "plural": false,
      "selections": [
        (v0/*: any*/),
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
      "kind": "ScalarField",
      "alias": null,
      "name": "createdAt",
      "args": null,
      "storageKey": null
    },
    {
      "kind": "ScalarField",
      "alias": null,
      "name": "headRefName",
      "args": null,
      "storageKey": null
    },
    {
      "kind": "LinkedField",
      "alias": null,
      "name": "headRepository",
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
        (v1/*: any*/)
      ]
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
          "name": "id",
          "args": null,
          "storageKey": null
        },
        (v1/*: any*/)
      ]
    }
  ]
};
})();
// prettier-ignore
(node/*: any*/).hash = '5d59ae918e2e401f97c673f02c2f99d8';
module.exports = node;
