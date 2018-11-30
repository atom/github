/**
 * @flow
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteFragment } from 'relay-runtime';
type issueDetailView_issueish$ref = any;
type issueDetailView_repository$ref = any;
type prDetailView_pullRequest$ref = any;
type prDetailView_repository$ref = any;
import type { FragmentReference } from "relay-runtime";
declare export opaque type issueishDetailController_repository$ref: FragmentReference;
export type issueishDetailController_repository = {|
  +name: string,
  +owner: {|
    +login: string
  |},
  +issueish: ?({|
    +__typename: "Issue",
    +title: string,
    +number: number,
    +$fragmentRefs: issueDetailView_issueish$ref,
  |} | {|
    // This will never be '%other', but we need some
    // value in case none of the concrete values match.
    +__typename: "%other"
  |}),
  +pullRequest: ?({|
    +__typename: "PullRequest",
    +title: string,
    +number: number,
    +headRefName: string,
    +headRepository: ?{|
      +name: string,
      +owner: {|
        +login: string
      |},
      +url: any,
      +sshUrl: any,
    |},
    +$fragmentRefs: prDetailView_pullRequest$ref,
  |} | {|
    // This will never be '%other', but we need some
    // value in case none of the concrete values match.
    +__typename: "%other"
  |}),
  +$fragmentRefs: issueDetailView_repository$ref & prDetailView_repository$ref,
  +$refType: issueishDetailController_repository$ref,
|};
*/


const node/*: ConcreteFragment*/ = (function(){
var v0 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "name",
  "args": null,
  "storageKey": null
},
v1 = {
  "kind": "LinkedField",
  "alias": null,
  "name": "owner",
  "storageKey": null,
  "args": null,
  "concreteType": null,
  "plural": false,
  "selections": [
    {
      "kind": "ScalarField",
      "alias": null,
      "name": "login",
      "args": null,
      "storageKey": null
    }
  ]
},
v2 = [
  {
    "kind": "Variable",
    "name": "number",
    "variableName": "issueishNumber",
    "type": "Int!"
  }
],
v3 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "__typename",
  "args": null,
  "storageKey": null
},
v4 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "title",
  "args": null,
  "storageKey": null
},
v5 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "number",
  "args": null,
  "storageKey": null
},
v6 = [
  {
    "kind": "Variable",
    "name": "commitCount",
    "variableName": "commitCount",
    "type": null
  },
  {
    "kind": "Variable",
    "name": "commitCursor",
    "variableName": "commitCursor",
    "type": null
  },
  {
    "kind": "Variable",
    "name": "timelineCount",
    "variableName": "timelineCount",
    "type": null
  },
  {
    "kind": "Variable",
    "name": "timelineCursor",
    "variableName": "timelineCursor",
    "type": null
  }
];
return {
  "kind": "Fragment",
  "name": "issueishDetailController_repository",
  "type": "Repository",
  "metadata": null,
  "argumentDefinitions": [
    {
      "kind": "LocalArgument",
      "name": "issueishNumber",
      "type": "Int!",
      "defaultValue": null
    },
    {
      "kind": "LocalArgument",
      "name": "timelineCount",
      "type": "Int!",
      "defaultValue": null
    },
    {
      "kind": "LocalArgument",
      "name": "timelineCursor",
      "type": "String",
      "defaultValue": null
    },
    {
      "kind": "LocalArgument",
      "name": "commitCount",
      "type": "Int!",
      "defaultValue": null
    },
    {
      "kind": "LocalArgument",
      "name": "commitCursor",
      "type": "String",
      "defaultValue": null
    }
  ],
  "selections": [
    {
      "kind": "FragmentSpread",
      "name": "issueDetailView_repository",
      "args": null
    },
    {
      "kind": "FragmentSpread",
      "name": "prDetailView_repository",
      "args": null
    },
    v0,
    v1,
    {
      "kind": "LinkedField",
      "alias": "issueish",
      "name": "issueOrPullRequest",
      "storageKey": null,
      "args": v2,
      "concreteType": null,
      "plural": false,
      "selections": [
        v3,
        {
          "kind": "InlineFragment",
          "type": "Issue",
          "selections": [
            v4,
            v5,
            {
              "kind": "FragmentSpread",
              "name": "issueDetailView_issueish",
              "args": v6
            }
          ]
        }
      ]
    },
    {
      "kind": "LinkedField",
      "alias": "pullRequest",
      "name": "issueOrPullRequest",
      "storageKey": null,
      "args": v2,
      "concreteType": null,
      "plural": false,
      "selections": [
        v3,
        {
          "kind": "InlineFragment",
          "type": "PullRequest",
          "selections": [
            v4,
            v5,
            {
              "kind": "ScalarField",
              "alias": null,
              "name": "headRefName",
              "args": null,
              "storageKey": null
            },
            {
              "kind": "LinkedField",
              "alias": null,
              "name": "headRepository",
              "storageKey": null,
              "args": null,
              "concreteType": "Repository",
              "plural": false,
              "selections": [
                v0,
                v1,
                {
                  "kind": "ScalarField",
                  "alias": null,
                  "name": "url",
                  "args": null,
                  "storageKey": null
                },
                {
                  "kind": "ScalarField",
                  "alias": null,
                  "name": "sshUrl",
                  "args": null,
                  "storageKey": null
                }
              ]
            },
            {
              "kind": "FragmentSpread",
              "name": "prDetailView_pullRequest",
              "args": v6
            }
          ]
        }
      ]
    }
  ]
};
})();
// prettier-ignore
(node/*: any*/).hash = '7b81a0a36c9be005da2a5bb6a876972c';
module.exports = node;
