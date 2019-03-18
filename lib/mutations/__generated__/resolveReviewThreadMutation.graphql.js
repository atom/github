/**
 * @flow
 * @relayHash 292d0c298ee0cead2a78ed197a943f85
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteRequest } from 'relay-runtime';
export type ResolveReviewThreadInput = {|
  threadId: string,
  clientMutationId?: ?string,
|};
export type resolveReviewThreadMutationVariables = {|
  input: ResolveReviewThreadInput
|};
export type resolveReviewThreadMutationResponse = {|
  +resolveReviewThread: ?{|
    +thread: ?{|
      +id: string,
      +isResolved: boolean,
    |}
  |}
|};
export type resolveReviewThreadMutation = {|
  variables: resolveReviewThreadMutationVariables,
  response: resolveReviewThreadMutationResponse,
|};
*/


/*
mutation resolveReviewThreadMutation(
  $input: ResolveReviewThreadInput!
) {
  resolveReviewThread(input: $input) {
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
    "type": "ResolveReviewThreadInput!",
    "defaultValue": null
  }
],
v1 = [
  {
    "kind": "LinkedField",
    "alias": null,
    "name": "resolveReviewThread",
    "storageKey": null,
    "args": [
      {
        "kind": "Variable",
        "name": "input",
        "variableName": "input",
        "type": "ResolveReviewThreadInput!"
      }
    ],
    "concreteType": "ResolveReviewThreadPayload",
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
    "name": "resolveReviewThreadMutation",
    "type": "Mutation",
    "metadata": null,
    "argumentDefinitions": (v0/*: any*/),
    "selections": (v1/*: any*/)
  },
  "operation": {
    "kind": "Operation",
    "name": "resolveReviewThreadMutation",
    "argumentDefinitions": (v0/*: any*/),
    "selections": (v1/*: any*/)
  },
  "params": {
    "operationKind": "mutation",
    "name": "resolveReviewThreadMutation",
    "id": null,
    "text": "mutation resolveReviewThreadMutation(\n  $input: ResolveReviewThreadInput!\n) {\n  resolveReviewThread(input: $input) {\n    thread {\n      id\n      isResolved\n    }\n  }\n}\n",
    "metadata": {}
  }
};
})();
// prettier-ignore
(node/*: any*/).hash = '78f712f96547e8bae804af3284762ded';
module.exports = node;
