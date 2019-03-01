/**
 * @flow
 * @relayHash 68140a8082e21c7d56516fb6ca6c8db7
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteRequest } from 'relay-runtime';
export type reviewsContainerQueryVariables = {|
  repoOwner: string,
  repoName: string,
|};
export type reviewsContainerQueryResponse = {|
  +repository: ?{|
    +id: string
  |}
|};
export type reviewsContainerQuery = {|
  variables: reviewsContainerQueryVariables,
  response: reviewsContainerQueryResponse,
|};
*/


/*
query reviewsContainerQuery(
  $repoOwner: String!
  $repoName: String!
) {
  repository(owner: $repoOwner, name: $repoName) {
    id
  }
}
*/

const node/*: ConcreteRequest*/ = (function(){
var v0 = [
  {
    "kind": "LocalArgument",
    "name": "repoOwner",
    "type": "String!",
    "defaultValue": null
  },
  {
    "kind": "LocalArgument",
    "name": "repoName",
    "type": "String!",
    "defaultValue": null
  }
],
v1 = [
  {
    "kind": "LinkedField",
    "alias": null,
    "name": "repository",
    "storageKey": null,
    "args": [
      {
        "kind": "Variable",
        "name": "name",
        "variableName": "repoName",
        "type": "String!"
      },
      {
        "kind": "Variable",
        "name": "owner",
        "variableName": "repoOwner",
        "type": "String!"
      }
    ],
    "concreteType": "Repository",
    "plural": false,
    "selections": [
      {
        "kind": "ScalarField",
        "alias": null,
        "name": "id",
        "args": null,
        "storageKey": null
      }
    ]
  }
];
return {
  "kind": "Request",
  "fragment": {
    "kind": "Fragment",
    "name": "reviewsContainerQuery",
    "type": "Query",
    "metadata": null,
    "argumentDefinitions": (v0/*: any*/),
    "selections": (v1/*: any*/)
  },
  "operation": {
    "kind": "Operation",
    "name": "reviewsContainerQuery",
    "argumentDefinitions": (v0/*: any*/),
    "selections": (v1/*: any*/)
  },
  "params": {
    "operationKind": "query",
    "name": "reviewsContainerQuery",
    "id": null,
    "text": "query reviewsContainerQuery(\n  $repoOwner: String!\n  $repoName: String!\n) {\n  repository(owner: $repoOwner, name: $repoName) {\n    id\n  }\n}\n",
    "metadata": {}
  }
};
})();
// prettier-ignore
(node/*: any*/).hash = '2a432f9e2a062215c96118ec0b5070cd';
module.exports = node;
