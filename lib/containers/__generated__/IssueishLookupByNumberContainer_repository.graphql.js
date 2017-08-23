/**
 * @flow
 */

/* eslint-disable */

'use strict';

/*::
import type {ConcreteFragment} from 'relay-runtime';
export type IssueishLookupByNumberContainer_repository = {|
  +name: string;
  +owner: {|
    +login: string;
  |};
  +issueish: ?{|
    +__typename: "Issue";
    +title: string;
    +number: number;
  |} | {|
    // This will never be '%other', but we need some
    // value in case none of the concrete values match.
    +__typename: "%other";
  |};
|};
*/


const fragment /*: ConcreteFragment*/ = {
  "argumentDefinitions": [
    {
      "kind": "RootArgument",
      "name": "issueishNumber",
      "type": "Int!"
    }
  ],
  "kind": "Fragment",
  "metadata": null,
  "name": "IssueishLookupByNumberContainer_repository",
  "selections": [
    {
      "kind": "FragmentSpread",
      "name": "IssueishPaneItemContainer_repository",
      "args": null
    },
    {
      "kind": "ScalarField",
      "alias": null,
      "args": null,
      "name": "name",
      "storageKey": null
    },
    {
      "kind": "LinkedField",
      "alias": null,
      "args": null,
      "concreteType": null,
      "name": "owner",
      "plural": false,
      "selections": [
        {
          "kind": "ScalarField",
          "alias": null,
          "args": null,
          "name": "login",
          "storageKey": null
        }
      ],
      "storageKey": null
    },
    {
      "kind": "LinkedField",
      "alias": "issueish",
      "args": [
        {
          "kind": "Variable",
          "name": "number",
          "variableName": "issueishNumber",
          "type": "Int!"
        }
      ],
      "concreteType": null,
      "name": "issueOrPullRequest",
      "plural": false,
      "selections": [
        {
          "kind": "ScalarField",
          "alias": null,
          "args": null,
          "name": "__typename",
          "storageKey": null
        },
        {
          "kind": "InlineFragment",
          "type": "PullRequest",
          "selections": [
            {
              "kind": "ScalarField",
              "alias": null,
              "args": null,
              "name": "title",
              "storageKey": null
            },
            {
              "kind": "ScalarField",
              "alias": null,
              "args": null,
              "name": "number",
              "storageKey": null
            },
            {
              "kind": "FragmentSpread",
              "name": "IssueishPaneItemContainer_issueish",
              "args": null
            }
          ]
        },
        {
          "kind": "InlineFragment",
          "type": "Issue",
          "selections": [
            {
              "kind": "ScalarField",
              "alias": null,
              "args": null,
              "name": "title",
              "storageKey": null
            },
            {
              "kind": "ScalarField",
              "alias": null,
              "args": null,
              "name": "number",
              "storageKey": null
            },
            {
              "kind": "FragmentSpread",
              "name": "IssueishPaneItemContainer_issueish",
              "args": null
            }
          ]
        }
      ],
      "storageKey": null
    }
  ],
  "type": "Repository"
};

module.exports = fragment;
