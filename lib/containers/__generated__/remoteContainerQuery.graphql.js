/**
 * @flow
 * @relayHash 31f49e2054e5af61819d6f3ca8228979
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteRequest } from 'relay-runtime';
export type remoteContainerQueryVariables = {|
  owner: string,
  name: string,
|};
export type remoteContainerQueryResponse = {|
  +repository: ?{|
    +defaultBranchRef: ?{|
      +prefix: string,
      +name: string,
    |}
  |}
|};
*/


/*
query remoteContainerQuery(
  $owner: String!
  $name: String!
) {
  repository(owner: $owner, name: $name) {
    defaultBranchRef {
      prefix
      name
      id
    }
    id
  }
}
*/

const node/*: ConcreteRequest*/ = (function(){
var v0 = [
  {
    "kind": "LocalArgument",
    "name": "owner",
    "type": "String!",
    "defaultValue": null
  },
  {
    "kind": "LocalArgument",
    "name": "name",
    "type": "String!",
    "defaultValue": null
  }
],
v1 = [
  {
    "kind": "Variable",
    "name": "name",
    "variableName": "name",
    "type": "String!"
  },
  {
    "kind": "Variable",
    "name": "owner",
    "variableName": "owner",
    "type": "String!"
  }
],
v2 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "prefix",
  "args": null,
  "storageKey": null
},
v3 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "name",
  "args": null,
  "storageKey": null
},
v4 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "id",
  "args": null,
  "storageKey": null
};
return {
  "kind": "Request",
  "operationKind": "query",
  "name": "remoteContainerQuery",
  "id": null,
  "text": "query remoteContainerQuery(\n  $owner: String!\n  $name: String!\n) {\n  repository(owner: $owner, name: $name) {\n    defaultBranchRef {\n      prefix\n      name\n      id\n    }\n    id\n  }\n}\n",
  "metadata": {},
  "fragment": {
    "kind": "Fragment",
    "name": "remoteContainerQuery",
    "type": "Query",
    "metadata": null,
    "argumentDefinitions": v0,
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "name": "repository",
        "storageKey": null,
        "args": v1,
        "concreteType": "Repository",
        "plural": false,
        "selections": [
          {
            "kind": "LinkedField",
            "alias": null,
            "name": "defaultBranchRef",
            "storageKey": null,
            "args": null,
            "concreteType": "Ref",
            "plural": false,
            "selections": [
              v2,
              v3
            ]
          }
        ]
      }
    ]
  },
  "operation": {
    "kind": "Operation",
    "name": "remoteContainerQuery",
    "argumentDefinitions": v0,
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "name": "repository",
        "storageKey": null,
        "args": v1,
        "concreteType": "Repository",
        "plural": false,
        "selections": [
          {
            "kind": "LinkedField",
            "alias": null,
            "name": "defaultBranchRef",
            "storageKey": null,
            "args": null,
            "concreteType": "Ref",
            "plural": false,
            "selections": [
              v2,
              v3,
              v4
            ]
          },
          v4
        ]
      }
    ]
  }
};
})();
// prettier-ignore
(node/*: any*/).hash = '491900781f0ba3de667b2d5262aa5ab4';
module.exports = node;
