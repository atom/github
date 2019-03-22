/**
 * @flow
 * @relayHash d5bbfbdbc61ad8446e83bf8d07222e0a
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
      +viewerCanResolve: boolean,
      +viewerCanUnresolve: boolean,
      +resolvedBy: ?{|
        +login: string
      |},
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
    "type": "ResolveReviewThreadInput!",
    "defaultValue": null
  }
],
v1 = [
  {
    "kind": "Variable",
    "name": "input",
    "variableName": "input",
    "type": "ResolveReviewThreadInput!"
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
    "name": "resolveReviewThreadMutation",
    "type": "Mutation",
    "metadata": null,
    "argumentDefinitions": (v0/*: any*/),
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "name": "resolveReviewThread",
        "storageKey": null,
        "args": (v1/*: any*/),
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
    "name": "resolveReviewThreadMutation",
    "argumentDefinitions": (v0/*: any*/),
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "name": "resolveReviewThread",
        "storageKey": null,
        "args": (v1/*: any*/),
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
    "name": "resolveReviewThreadMutation",
    "id": null,
    "text": "mutation resolveReviewThreadMutation(\n  $input: ResolveReviewThreadInput!\n) {\n  resolveReviewThread(input: $input) {\n    thread {\n      id\n      isResolved\n      viewerCanResolve\n      viewerCanUnresolve\n      resolvedBy {\n        login\n        id\n      }\n    }\n  }\n}\n",
    "metadata": {}
  }
};
})();
// prettier-ignore
(node/*: any*/).hash = '7cd0eeaed0f492437f1aa6811c25c1a5';
module.exports = node;
