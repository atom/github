/**
 * @flow
 * @relayHash ea6ef8d4349c49d19249d09871597120
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteRequest } from 'relay-runtime';
export type UnresolveReviewThreadInput = {|
  threadId: string,
  clientMutationId?: ?string,
|};
export type unresolveReviewThreadMutationVariables = {|
  input: UnresolveReviewThreadInput
|};
export type unresolveReviewThreadMutationResponse = {|
  +unresolveReviewThread: ?{|
    +thread: ?{|
      +id: string,
      +isResolved: boolean,
    |}
  |}
|};
export type unresolveReviewThreadMutation = {|
  variables: unresolveReviewThreadMutationVariables,
  response: unresolveReviewThreadMutationResponse,
|};
*/


/*
mutation unresolveReviewThreadMutation(
  $input: UnresolveReviewThreadInput!
) {
  unresolveReviewThread(input: $input) {
    thread {
      id
      isResolved
    }
  }
}
*/

const node/*: ConcreteRequest*/ = (function(){
var v0 = [
  {
    "kind": "LocalArgument",
    "name": "input",
    "type": "UnresolveReviewThreadInput!",
    "defaultValue": null
  }
],
v1 = [
  {
    "kind": "LinkedField",
    "alias": null,
    "name": "unresolveReviewThread",
    "storageKey": null,
    "args": [
      {
        "kind": "Variable",
        "name": "input",
        "variableName": "input",
        "type": "UnresolveReviewThreadInput!"
      }
    ],
    "concreteType": "UnresolveReviewThreadPayload",
    "plural": false,
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "name": "thread",
        "storageKey": null,
        "args": null,
        "concreteType": "PullRequestReviewThread",
        "plural": false,
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
            "name": "isResolved",
            "args": null,
            "storageKey": null
          }
        ]
      }
    ]
  }
];
return {
  "kind": "Request",
  "fragment": {
    "kind": "Fragment",
    "name": "unresolveReviewThreadMutation",
    "type": "Mutation",
    "metadata": null,
    "argumentDefinitions": (v0/*: any*/),
    "selections": (v1/*: any*/)
  },
  "operation": {
    "kind": "Operation",
    "name": "unresolveReviewThreadMutation",
    "argumentDefinitions": (v0/*: any*/),
    "selections": (v1/*: any*/)
  },
  "params": {
    "operationKind": "mutation",
    "name": "unresolveReviewThreadMutation",
    "id": null,
    "text": "mutation unresolveReviewThreadMutation(\n  $input: UnresolveReviewThreadInput!\n) {\n  unresolveReviewThread(input: $input) {\n    thread {\n      id\n      isResolved\n    }\n  }\n}\n",
    "metadata": {}
  }
};
})();
// prettier-ignore
(node/*: any*/).hash = '73a7d19a172cd80e2dd06e849a05317d';
module.exports = node;
