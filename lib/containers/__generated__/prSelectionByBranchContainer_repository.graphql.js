/**
 * @flow
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteFragment } from 'relay-runtime';
type prInfoContainer_pullRequest$ref = any;
import type { FragmentReference } from "relay-runtime";
declare export opaque type prSelectionByBranchContainer_repository$ref: FragmentReference;
export type prSelectionByBranchContainer_repository = {|
  +defaultBranchRef: ?{|
    +prefix: string,
    +name: string,
  |},
  +pullRequests: {|
    +totalCount: number,
    +edges: ?$ReadOnlyArray<?{|
      +node: ?{|
        +id: string,
        +number: number,
        +title: string,
        +url: any,
        +$fragmentRefs: prInfoContainer_pullRequest$ref,
      |}
    |}>,
  |},
  +$refType: prSelectionByBranchContainer_repository$ref,
|};
*/


const node/*: ConcreteFragment*/ = {
  "kind": "Fragment",
  "name": "prSelectionByBranchContainer_repository",
  "type": "Repository",
  "metadata": null,
  "argumentDefinitions": [
    {
      "kind": "RootArgument",
      "name": "branchName",
      "type": "String"
    }
  ],
  "selections": [
    {
      "kind": "LinkedField",
      "alias": null,
      "name": "defaultBranchRef",
      "storageKey": null,
      "args": null,
      "concreteType": "Ref",
      "plural": false,
      "selections": [
        {
          "kind": "ScalarField",
          "alias": null,
          "name": "prefix",
          "args": null,
          "storageKey": null
        },
        {
          "kind": "ScalarField",
          "alias": null,
          "name": "name",
          "args": null,
          "storageKey": null
        }
      ]
    },
    {
      "kind": "LinkedField",
      "alias": null,
      "name": "pullRequests",
      "storageKey": null,
      "args": [
        {
          "kind": "Literal",
          "name": "first",
          "value": 30,
          "type": "Int"
        },
        {
          "kind": "Variable",
          "name": "headRefName",
          "variableName": "branchName",
          "type": "String"
        }
      ],
      "concreteType": "PullRequestConnection",
      "plural": false,
      "selections": [
        {
          "kind": "ScalarField",
          "alias": null,
          "name": "totalCount",
          "args": null,
          "storageKey": null
        },
        {
          "kind": "LinkedField",
          "alias": null,
          "name": "edges",
          "storageKey": null,
          "args": null,
          "concreteType": "PullRequestEdge",
          "plural": true,
          "selections": [
            {
              "kind": "LinkedField",
              "alias": null,
              "name": "node",
              "storageKey": null,
              "args": null,
              "concreteType": "PullRequest",
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
                  "name": "number",
                  "args": null,
                  "storageKey": null
                },
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
                  "name": "url",
                  "args": null,
                  "storageKey": null
                },
                {
                  "kind": "FragmentSpread",
                  "name": "prInfoContainer_pullRequest",
                  "args": null
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};
// prettier-ignore
(node/*: any*/).hash = '5563c813ad25fad3aaf8cf2c1974f88d';
module.exports = node;
