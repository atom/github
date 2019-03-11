/**
 * @flow
 * @relayHash 91c1ffd696461672a1845a938ae19ead
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteRequest } from 'relay-runtime';
export type prChangedFilesContainer_RawDiffQueryVariables = {|
  owner: string,
  repo: string,
  number: number,
|};
export type prChangedFilesContainer_RawDiffQueryResponse = {|
  +repository: ?{|
    +pullRequest: ?{|
      +rawDiff: string
    |}
  |}
|};
export type prChangedFilesContainer_RawDiffQuery = {|
  variables: prChangedFilesContainer_RawDiffQueryVariables,
  response: prChangedFilesContainer_RawDiffQueryResponse,
|};
*/


/*
query prChangedFilesContainer_RawDiffQuery(
  $owner: String!
  $repo: String!
  $number: Int!
) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $number) {
      rawDiff
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
    "name": "repo",
    "type": "String!",
    "defaultValue": null
  },
  {
    "kind": "LocalArgument",
    "name": "number",
    "type": "Int!",
    "defaultValue": null
  }
],
v1 = [
  {
    "kind": "Variable",
    "name": "name",
    "variableName": "repo",
    "type": "String!"
  },
  {
    "kind": "Variable",
    "name": "owner",
    "variableName": "owner",
    "type": "String!"
  }
],
v2 = [
  {
    "kind": "Variable",
    "name": "number",
    "variableName": "number",
    "type": "Int!"
  }
],
v3 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "rawDiff",
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
  "fragment": {
    "kind": "Fragment",
    "name": "prChangedFilesContainer_RawDiffQuery",
    "type": "Query",
    "metadata": null,
    "argumentDefinitions": (v0/*: any*/),
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "name": "repository",
        "storageKey": null,
        "args": (v1/*: any*/),
        "concreteType": "Repository",
        "plural": false,
        "selections": [
          {
            "kind": "LinkedField",
            "alias": null,
            "name": "pullRequest",
            "storageKey": null,
            "args": (v2/*: any*/),
            "concreteType": "PullRequest",
            "plural": false,
            "selections": [
              (v3/*: any*/)
            ]
          }
        ]
      }
    ]
  },
  "operation": {
    "kind": "Operation",
    "name": "prChangedFilesContainer_RawDiffQuery",
    "argumentDefinitions": (v0/*: any*/),
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "name": "repository",
        "storageKey": null,
        "args": (v1/*: any*/),
        "concreteType": "Repository",
        "plural": false,
        "selections": [
          {
            "kind": "LinkedField",
            "alias": null,
            "name": "pullRequest",
            "storageKey": null,
            "args": (v2/*: any*/),
            "concreteType": "PullRequest",
            "plural": false,
            "selections": [
              (v3/*: any*/),
              (v4/*: any*/)
            ]
          },
          (v4/*: any*/)
        ]
      }
    ]
  },
  "params": {
    "operationKind": "query",
    "name": "prChangedFilesContainer_RawDiffQuery",
    "id": null,
    "text": "query prChangedFilesContainer_RawDiffQuery(\n  $owner: String!\n  $repo: String!\n  $number: Int!\n) {\n  repository(owner: $owner, name: $repo) {\n    pullRequest(number: $number) {\n      rawDiff\n      id\n    }\n    id\n  }\n}\n",
    "metadata": {}
  }
};
})();
// prettier-ignore
(node/*: any*/).hash = '31519a5471b91030d87678920df1aaf8';
module.exports = node;
