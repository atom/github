/**
 * @flow
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteFragment } from 'relay-runtime';
type issueishPaneItemContainer_issueish$ref = any;
type issueishPaneItemContainer_repository$ref = any;
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
    +$fragmentRefs: issueishPaneItemContainer_issueish$ref,
  |} | {|
    // This will never be '%other', but we need some
    // value in case none of the concrete values match.
    +__typename: "%other"
  |}),
  +$fragmentRefs: issueishPaneItemContainer_repository$ref,
  +$refType: issueishDetailController_repository$ref,
|};
*/


const node/*: ConcreteFragment*/ = (function(){
var v0 = [
  {
    "kind": "ScalarField",
    "alias": null,
    "name": "title",
    "args": null,
    "storageKey": null
  },
  {
    "kind": "ScalarField",
    "alias": null,
    "name": "number",
    "args": null,
    "storageKey": null
  },
  {
    "kind": "FragmentSpread",
    "name": "issueishPaneItemContainer_issueish",
    "args": [
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
    ]
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
      "name": "timelineCount",
      "type": "Int",
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
      "name": "issueishNumber",
      "type": "Int!",
      "defaultValue": null
    }
  ],
  "selections": [
    {
      "kind": "FragmentSpread",
      "name": "issueishPaneItemContainer_repository",
      "args": null
    },
    {
      "kind": "ScalarField",
      "alias": null,
      "name": "name",
      "args": null,
      "storageKey": null
    },
    {
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
    {
      "kind": "LinkedField",
      "alias": "issueish",
      "name": "issueOrPullRequest",
      "storageKey": null,
      "args": [
        {
          "kind": "Variable",
          "name": "number",
          "variableName": "issueishNumber",
          "type": "Int!"
        }
      ],
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
        {
          "kind": "InlineFragment",
          "type": "PullRequest",
          "selections": v0
        },
        {
          "kind": "InlineFragment",
          "type": "Issue",
          "selections": v0
        }
      ]
    }
  ]
};
})();
// prettier-ignore
(node/*: any*/).hash = 'eaeab6bcc00588b29a2eaf7b6c107176';
module.exports = node;
