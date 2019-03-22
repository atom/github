/**
 * @flow
 * @relayHash a9e9b29cc74054c8c65347db6560ee80
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
      +viewerCanResolve: boolean,
      +viewerCanUnresolve: boolean,
      +resolvedBy: ?{|
        +login: string
      |},
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
      viewerCanResolve
      viewerCanUnresolve
      resolvedBy {
        login
        id
      }
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
    "kind": "Variable",
    "name": "input",
    "variableName": "input",
    "type": "UnresolveReviewThreadInput!"
  }
],
v2 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "id",
  "args": null,
  "storageKey": null
},
v3 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "isResolved",
  "args": null,
  "storageKey": null
},
v4 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "viewerCanResolve",
  "args": null,
  "storageKey": null
},
v5 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "viewerCanUnresolve",
  "args": null,
  "storageKey": null
},
v6 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "login",
  "args": null,
  "storageKey": null
};
return {
  "kind": "Request",
  "fragment": {
    "kind": "Fragment",
    "name": "unresolveReviewThreadMutation",
    "type": "Mutation",
    "metadata": null,
    "argumentDefinitions": (v0/*: any*/),
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "name": "unresolveReviewThread",
        "storageKey": null,
        "args": (v1/*: any*/),
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
              (v2/*: any*/),
              (v3/*: any*/),
              (v4/*: any*/),
              (v5/*: any*/),
              {
                "kind": "LinkedField",
                "alias": null,
                "name": "resolvedBy",
                "storageKey": null,
                "args": null,
                "concreteType": "User",
                "plural": false,
                "selections": [
                  (v6/*: any*/)
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  "operation": {
    "kind": "Operation",
    "name": "unresolveReviewThreadMutation",
    "argumentDefinitions": (v0/*: any*/),
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "name": "unresolveReviewThread",
        "storageKey": null,
        "args": (v1/*: any*/),
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
              (v2/*: any*/),
              (v3/*: any*/),
              (v4/*: any*/),
              (v5/*: any*/),
              {
                "kind": "LinkedField",
                "alias": null,
                "name": "resolvedBy",
                "storageKey": null,
                "args": null,
                "concreteType": "User",
                "plural": false,
                "selections": [
                  (v6/*: any*/),
                  (v2/*: any*/)
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  "params": {
    "operationKind": "mutation",
    "name": "unresolveReviewThreadMutation",
    "id": null,
    "text": "mutation unresolveReviewThreadMutation(\n  $input: UnresolveReviewThreadInput!\n) {\n  unresolveReviewThread(input: $input) {\n    thread {\n      id\n      isResolved\n      viewerCanResolve\n      viewerCanUnresolve\n      resolvedBy {\n        login\n        id\n      }\n    }\n  }\n}\n",
    "metadata": {}
  }
};
})();
// prettier-ignore
(node/*: any*/).hash = 'bf0ab25ba997e2c202a6273a029ffc18';
module.exports = node;
