/**
 * @flow
 */

/* eslint-disable */

'use strict';

/*::
import type {ConcreteFragment} from 'relay-runtime';
export type PrSelectionByBranchContainer_repository = {|
  +pullRequests: {|
    +totalCount: number;
    +edges: ?$ReadOnlyArray<?{|
      +node: ?{|
        +id: string;
        +number: number;
        +title: string;
        +url: any;
      |};
    |}>;
  |};
|};
*/


const fragment /*: ConcreteFragment*/ = {
  "argumentDefinitions": [
    {
      "kind": "RootArgument",
      "name": "branchName",
      "type": "String"
    }
  ],
  "kind": "Fragment",
  "metadata": null,
  "name": "PrSelectionByBranchContainer_repository",
  "selections": [
    {
      "kind": "LinkedField",
      "alias": null,
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
      "name": "pullRequests",
      "plural": false,
      "selections": [
        {
          "kind": "ScalarField",
          "alias": null,
          "args": null,
          "name": "totalCount",
          "storageKey": null
        },
        {
          "kind": "LinkedField",
          "alias": null,
          "args": null,
          "concreteType": "PullRequestEdge",
          "name": "edges",
          "plural": true,
          "selections": [
            {
              "kind": "LinkedField",
              "alias": null,
              "args": null,
              "concreteType": "PullRequest",
              "name": "node",
              "plural": false,
              "selections": [
                {
                  "kind": "ScalarField",
                  "alias": null,
                  "args": null,
                  "name": "id",
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
                  "name": "url",
                  "storageKey": null
                },
                {
                  "kind": "FragmentSpread",
                  "name": "PrInfoContainer_pullRequest",
                  "args": null
                }
              ],
              "storageKey": null
            }
          ],
          "storageKey": null
        }
      ],
      "storageKey": null
    }
  ],
  "type": "Repository"
};

module.exports = fragment;
