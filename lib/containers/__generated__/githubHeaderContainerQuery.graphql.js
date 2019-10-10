/**
 * @flow
 * @relayHash 1fc294f177f0be857503309c013873a8
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteRequest } from 'relay-runtime';
export type githubHeaderContainerQueryVariables = {||};
export type githubHeaderContainerQueryResponse = {|
  +viewer: {|
    +avatarUrl: any
  |}
|};
export type githubHeaderContainerQuery = {|
  variables: githubHeaderContainerQueryVariables,
  response: githubHeaderContainerQueryResponse,
|};
*/


/*
query githubHeaderContainerQuery {
  viewer {
    avatarUrl
    id
  }
}
*/

const node/*: ConcreteRequest*/ = (function(){
var v0 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "avatarUrl",
  "args": null,
  "storageKey": null
};
return {
  "kind": "Request",
  "fragment": {
    "kind": "Fragment",
    "name": "githubHeaderContainerQuery",
    "type": "Query",
    "metadata": null,
    "argumentDefinitions": [],
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "name": "viewer",
        "storageKey": null,
        "args": null,
        "concreteType": "User",
        "plural": false,
        "selections": [
          (v0/*: any*/)
        ]
      }
    ]
  },
  "operation": {
    "kind": "Operation",
    "name": "githubHeaderContainerQuery",
    "argumentDefinitions": [],
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "name": "viewer",
        "storageKey": null,
        "args": null,
        "concreteType": "User",
        "plural": false,
        "selections": [
          (v0/*: any*/),
          {
            "kind": "ScalarField",
            "alias": null,
            "name": "id",
            "args": null,
            "storageKey": null
          }
        ]
      }
    ]
  },
  "params": {
    "operationKind": "query",
    "name": "githubHeaderContainerQuery",
    "id": null,
    "text": "query githubHeaderContainerQuery {\n  viewer {\n    avatarUrl\n    id\n  }\n}\n",
    "metadata": {}
  }
};
})();
// prettier-ignore
(node/*: any*/).hash = '8f64904c4645e6e5b69683dd100f6a6e';
module.exports = node;
