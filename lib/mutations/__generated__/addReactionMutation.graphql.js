/**
 * @flow
 * @relayHash 93ce2bd399332aa59ccaf5ced813e98f
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteRequest } from 'relay-runtime';
export type ReactionContent = "CONFUSED" | "EYES" | "HEART" | "HOORAY" | "LAUGH" | "ROCKET" | "THUMBS_DOWN" | "THUMBS_UP" | "%future added value";
export type AddReactionInput = {|
  subjectId: string,
  content: ReactionContent,
  clientMutationId?: ?string,
|};
export type addReactionMutationVariables = {|
  input: AddReactionInput
|};
export type addReactionMutationResponse = {|
  +addReaction: ?{|
    +subject: ?{|
      +reactionGroups: ?$ReadOnlyArray<{|
        +content: ReactionContent,
        +users: {|
          +totalCount: number
        |},
      |}>
    |}
  |}
|};
export type addReactionMutation = {|
  variables: addReactionMutationVariables,
  response: addReactionMutationResponse,
|};
*/


/*
mutation addReactionMutation(
  $input: AddReactionInput!
) {
  addReaction(input: $input) {
    subject {
      __typename
      reactionGroups {
        content
        users {
          totalCount
        }
      }
      id
    }
  }
}
*/

const node/*: ConcreteRequest*/ = (function(){
var v0 = [
  {
    "kind": "LocalArgument",
    "name": "input",
    "type": "AddReactionInput!",
    "defaultValue": null
  }
],
v1 = [
  {
    "kind": "Variable",
    "name": "input",
    "variableName": "input",
    "type": "AddReactionInput!"
  }
],
v2 = {
  "kind": "LinkedField",
  "alias": null,
  "name": "reactionGroups",
  "storageKey": null,
  "args": null,
  "concreteType": "ReactionGroup",
  "plural": true,
  "selections": [
    {
      "kind": "ScalarField",
      "alias": null,
      "name": "content",
      "args": null,
      "storageKey": null
    },
    {
      "kind": "LinkedField",
      "alias": null,
      "name": "users",
      "storageKey": null,
      "args": null,
      "concreteType": "ReactingUserConnection",
      "plural": false,
      "selections": [
        {
          "kind": "ScalarField",
          "alias": null,
          "name": "totalCount",
          "args": null,
          "storageKey": null
        }
      ]
    }
  ]
};
return {
  "kind": "Request",
  "fragment": {
    "kind": "Fragment",
    "name": "addReactionMutation",
    "type": "Mutation",
    "metadata": null,
    "argumentDefinitions": (v0/*: any*/),
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "name": "addReaction",
        "storageKey": null,
        "args": (v1/*: any*/),
        "concreteType": "AddReactionPayload",
        "plural": false,
        "selections": [
          {
            "kind": "LinkedField",
            "alias": null,
            "name": "subject",
            "storageKey": null,
            "args": null,
            "concreteType": null,
            "plural": false,
            "selections": [
              (v2/*: any*/)
            ]
          }
        ]
      }
    ]
  },
  "operation": {
    "kind": "Operation",
    "name": "addReactionMutation",
    "argumentDefinitions": (v0/*: any*/),
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "name": "addReaction",
        "storageKey": null,
        "args": (v1/*: any*/),
        "concreteType": "AddReactionPayload",
        "plural": false,
        "selections": [
          {
            "kind": "LinkedField",
            "alias": null,
            "name": "subject",
            "storageKey": null,
            "args": null,
            "concreteType": null,
            "plural": false,
            "selections": [
              {
                "kind": "ScalarField",
                "alias": null,
                "name": "__typename",
                "args": null,
                "storageKey": null
              },
              (v2/*: any*/),
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
      }
    ]
  },
  "params": {
    "operationKind": "mutation",
    "name": "addReactionMutation",
    "id": null,
    "text": "mutation addReactionMutation(\n  $input: AddReactionInput!\n) {\n  addReaction(input: $input) {\n    subject {\n      __typename\n      reactionGroups {\n        content\n        users {\n          totalCount\n        }\n      }\n      id\n    }\n  }\n}\n",
    "metadata": {}
  }
};
})();
// prettier-ignore
(node/*: any*/).hash = '85ce2114c1ed19803b52f174f037f9b0';
module.exports = node;
