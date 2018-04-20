/**
 * @flow
 */

/* eslint-disable */

'use strict';

/*::
import type {ConcreteFragment} from 'relay-runtime';
export type prStatusContextContainer_context = {|
  +context: string;
  +description: ?string;
  +state: "EXPECTED" | "ERROR" | "FAILURE" | "PENDING" | "SUCCESS";
  +targetUrl: ?any;
|};
*/


const fragment /*: ConcreteFragment*/ = {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "prStatusContextContainer_context",
  "selections": [
    {
      "kind": "ScalarField",
      "alias": null,
      "args": null,
      "name": "context",
      "storageKey": null
    },
    {
      "kind": "ScalarField",
      "alias": null,
      "args": null,
      "name": "description",
      "storageKey": null
    },
    {
      "kind": "ScalarField",
      "alias": null,
      "args": null,
      "name": "state",
      "storageKey": null
    },
    {
      "kind": "ScalarField",
      "alias": null,
      "args": null,
      "name": "targetUrl",
      "storageKey": null
    }
  ],
  "type": "StatusContext"
};

module.exports = fragment;
