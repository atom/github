/**
 * @flow
 * @relayHash 6f60db0700812e37c5c5f835b64af67f
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteRequest } from 'relay-runtime';
export type UpdatePullRequestReviewInput = {|
  pullRequestReviewId: string,
  body: string,
  clientMutationId?: ?string,
|};
export type updatePrReviewSummaryMutationVariables = {|
  input: UpdatePullRequestReviewInput
|};
export type updatePrReviewSummaryMutationResponse = {|
  +updatePullRequestReview: ?{|
    +pullRequestReview: ?{|
      +id: string,
      +body: string,
      +bodyHTML: any,
    |}
  |}
|};
export type updatePrReviewSummaryMutation = {|
  variables: updatePrReviewSummaryMutationVariables,
  response: updatePrReviewSummaryMutationResponse,
|};
*/


/*
mutation updatePrReviewSummaryMutation(
  $input: UpdatePullRequestReviewInput!
) {
  updatePullRequestReview(input: $input) {
    pullRequestReview {
      id
      body
      bodyHTML
    }
  }
}
*/

const node/*: ConcreteRequest*/ = (function(){
var v0 = [
  {
    "kind": "LocalArgument",
    "name": "input",
    "type": "UpdatePullRequestReviewInput!",
    "defaultValue": null
  }
],
v1 = [
  {
    "kind": "LinkedField",
    "alias": null,
    "name": "updatePullRequestReview",
    "storageKey": null,
    "args": [
      {
        "kind": "Variable",
        "name": "input",
        "variableName": "input",
        "type": "UpdatePullRequestReviewInput!"
      }
    ],
    "concreteType": "UpdatePullRequestReviewPayload",
    "plural": false,
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "name": "pullRequestReview",
        "storageKey": null,
        "args": null,
        "concreteType": "PullRequestReview",
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
          },
          {
            "kind": "ScalarField",
            "alias": null,
            "name": "bodyHTML",
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
    "name": "updatePrReviewSummaryMutation",
    "type": "Mutation",
    "metadata": null,
    "argumentDefinitions": (v0/*: any*/),
    "selections": (v1/*: any*/)
  },
  "operation": {
    "kind": "Operation",
    "name": "updatePrReviewSummaryMutation",
    "argumentDefinitions": (v0/*: any*/),
    "selections": (v1/*: any*/)
  },
  "params": {
    "operationKind": "mutation",
    "name": "updatePrReviewSummaryMutation",
    "id": null,
    "text": "mutation updatePrReviewSummaryMutation(\n  $input: UpdatePullRequestReviewInput!\n) {\n  updatePullRequestReview(input: $input) {\n    pullRequestReview {\n      id\n      body\n      bodyHTML\n    }\n  }\n}\n",
    "metadata": {}
  }
};
})();
// prettier-ignore
(node/*: any*/).hash = 'e8da32c47a4d30e206902f1fe4aa4607';
module.exports = node;
