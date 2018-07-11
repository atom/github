/**
 * @flow
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteFragment } from 'relay-runtime';
import type { FragmentReference } from "relay-runtime";
declare export opaque type headRefForcePushedEventView_issueish$ref: FragmentReference;
export type headRefForcePushedEventView_issueish = {|
  +headRefName: string,
  +headRepositoryOwner: ?{|
    +login: string
  |},
  +repository: {|
    +owner: {|
      +login: string
    |}
  |},
  +$refType: headRefForcePushedEventView_issueish$ref,
|};
*/


const node/*: ConcreteFragment*/ = (function(){
var v0 = [
  {
    "kind": "ScalarField",
    "alias": null,
    "name": "login",
    "args": null,
    "storageKey": null
  }
];
return {
  "kind": "Fragment",
  "name": "headRefForcePushedEventView_issueish",
  "type": "PullRequest",
  "metadata": null,
  "argumentDefinitions": [],
  "selections": [
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
      "name": "headRepositoryOwner",
      "storageKey": null,
      "args": null,
      "concreteType": null,
      "plural": false,
      "selections": v0
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
          "kind": "LinkedField",
          "alias": null,
          "name": "owner",
          "storageKey": null,
          "args": null,
          "concreteType": null,
          "plural": false,
          "selections": v0
        }
      ]
    }
  ]
};
})();
// prettier-ignore
(node/*: any*/).hash = '4c639070afc4a02cedf062d836d0dd7f';
module.exports = node;
