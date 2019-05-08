/**
 * @flow
 * @relayHash 3d3a170f4f0ba10eaa8eae74bcc57f9d
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteRequest } from 'relay-runtime';
export type UpdatePullRequestReviewCommentInput = {|
  pullRequestReviewCommentId: string,
  body: string,
  clientMutationId?: ?string,
|};
export type updatePrReviewCommentMutationVariables = {|
  input: UpdatePullRequestReviewCommentInput
|};
export type updatePrReviewCommentMutationResponse = {|
  +updatePullRequestReviewComment: ?{|
    +pullRequestReviewComment: ?{|
      +id: string,
      +body: string,
    |}
  |}
|};
export type updatePrReviewCommentMutation = {|
  variables: updatePrReviewCommentMutationVariables,
  response: updatePrReviewCommentMutationResponse,
|};
*/


/*
mutation updatePrReviewCommentMutation(
  $input: UpdatePullRequestReviewCommentInput!
) {
  updatePullRequestReviewComment(input: $input) {
    pullRequestReviewComment {
      id
      body
    }
  }
}
*/

const node/*: ConcreteRequest*/ = (function(){
var v0 = [
  {
    "kind": "LocalArgument",
    "name": "input",
    "type": "UpdatePullRequestReviewCommentInput!",
    "defaultValue": null
  }
],
v1 = [
  {
    "kind": "LinkedField",
    "alias": null,
    "name": "updatePullRequestReviewComment",
    "storageKey": null,
    "args": [
      {
        "kind": "Variable",
        "name": "input",
        "variableName": "input",
        "type": "UpdatePullRequestReviewCommentInput!"
      }
    ],
    "concreteType": "UpdatePullRequestReviewCommentPayload",
    "plural": false,
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "name": "pullRequestReviewComment",
        "storageKey": null,
        "args": null,
        "concreteType": "PullRequestReviewComment",
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
            "name": "body",
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
    "name": "updatePrReviewCommentMutation",
    "type": "Mutation",
    "metadata": null,
    "argumentDefinitions": (v0/*: any*/),
    "selections": (v1/*: any*/)
  },
  "operation": {
    "kind": "Operation",
    "name": "updatePrReviewCommentMutation",
    "argumentDefinitions": (v0/*: any*/),
    "selections": (v1/*: any*/)
  },
  "params": {
    "operationKind": "mutation",
    "name": "updatePrReviewCommentMutation",
    "id": null,
    "text": "mutation updatePrReviewCommentMutation(\n  $input: UpdatePullRequestReviewCommentInput!\n) {\n  updatePullRequestReviewComment(input: $input) {\n    pullRequestReviewComment {\n      id\n      body\n    }\n  }\n}\n",
    "metadata": {}
  }
};
})();
// prettier-ignore
(node/*: any*/).hash = '95910154c5572a47306db28dd5c6ce24';
module.exports = node;
