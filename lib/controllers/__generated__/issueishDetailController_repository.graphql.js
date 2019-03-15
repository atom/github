/**
 * @flow
 */

/* eslint-disable */

'use strict';

/*::
import type { ReaderFragment } from 'relay-runtime';
type issueDetailView_issue$ref = any;
type issueDetailView_repository$ref = any;
type prCheckoutController_pullRequest$ref = any;
type prCheckoutController_repository$ref = any;
type prDetailView_pullRequest$ref = any;
type prDetailView_repository$ref = any;
import type { FragmentReference } from "relay-runtime";
declare export opaque type issueishDetailController_repository$ref: FragmentReference;
export type issueishDetailController_repository = {|
  +name: string,
  +owner: {|
    +login: string
  |},
  +issue: ?({|
    +__typename: "Issue",
    +title: string,
    +number: number,
    +$fragmentRefs: issueDetailView_issue$ref,
  |} | {|
    // This will never be '%other', but we need some
    // value in case none of the concrete values match.
    +__typename: "%other"
  |}),
  +pullRequest: ?({|
    +__typename: "PullRequest",
    +title: string,
    +number: number,
    +$fragmentRefs: prCheckoutController_pullRequest$ref & prDetailView_pullRequest$ref,
  |} | {|
    // This will never be '%other', but we need some
    // value in case none of the concrete values match.
    +__typename: "%other"
  |}),
  +$fragmentRefs: issueDetailView_repository$ref & prCheckoutController_repository$ref & prDetailView_repository$ref,
  +$refType: issueishDetailController_repository$ref,
|};
*/


const node/*: ReaderFragment*/ = (function(){
var v0 = [
  {
    "kind": "Variable",
    "name": "number",
    "variableName": "issueishNumber",
    "type": "Int!"
  }
],
v1 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "__typename",
  "args": null,
  "storageKey": null
},
v2 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "title",
  "args": null,
  "storageKey": null
},
v3 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "number",
  "args": null,
  "storageKey": null
},
v4 = {
  "kind": "Variable",
  "name": "timelineCount",
  "variableName": "timelineCount",
  "type": null
},
v5 = {
  "kind": "Variable",
  "name": "timelineCursor",
  "variableName": "timelineCursor",
  "type": null
};
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
    },
    {
      "kind": "RootArgument",
      "name": "reviewCount",
      "type": null
    },
    {
      "kind": "RootArgument",
      "name": "reviewCursor",
      "type": null
    },
    {
      "kind": "RootArgument",
      "name": "threadCount",
      "type": null
    },
    {
      "kind": "RootArgument",
      "name": "threadCursor",
      "type": null
    },
    {
      "kind": "RootArgument",
      "name": "commentCount",
      "type": null
    },
    {
      "kind": "RootArgument",
      "name": "commentCursor",
      "type": null
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
      "name": "prCheckoutController_repository",
      "args": null
    },
    {
      "kind": "FragmentSpread",
      "name": "prDetailView_repository",
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
      "alias": "issue",
      "name": "issueOrPullRequest",
      "storageKey": null,
      "args": (v0/*: any*/),
      "concreteType": null,
      "plural": false,
      "selections": [
        (v1/*: any*/),
        {
          "kind": "InlineFragment",
          "type": "Issue",
          "selections": [
            (v2/*: any*/),
            (v3/*: any*/),
            {
              "kind": "FragmentSpread",
              "name": "issueDetailView_issue",
              "args": [
                (v4/*: any*/),
                (v5/*: any*/)
              ]
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
      "args": (v0/*: any*/),
      "concreteType": null,
      "plural": false,
      "selections": [
        (v1/*: any*/),
        {
          "kind": "InlineFragment",
          "type": "PullRequest",
          "selections": [
            (v2/*: any*/),
            (v3/*: any*/),
            {
              "kind": "FragmentSpread",
              "name": "prCheckoutController_pullRequest",
              "args": null
            },
            {
              "kind": "FragmentSpread",
              "name": "prDetailView_pullRequest",
              "args": [
                {
                  "kind": "Variable",
                  "name": "commentCount",
                  "variableName": "commentCount",
                  "type": null
                },
                {
                  "kind": "Variable",
                  "name": "commentCursor",
                  "variableName": "commentCursor",
                  "type": null
                },
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
                  "name": "reviewCount",
                  "variableName": "reviewCount",
                  "type": null
                },
                {
                  "kind": "Variable",
                  "name": "reviewCursor",
                  "variableName": "reviewCursor",
                  "type": null
                },
                {
                  "kind": "Variable",
                  "name": "threadCount",
                  "variableName": "threadCount",
                  "type": null
                },
                {
                  "kind": "Variable",
                  "name": "threadCursor",
                  "variableName": "threadCursor",
                  "type": null
                },
                (v4/*: any*/),
                (v5/*: any*/)
              ]
            }
          ]
        }
      ]
    }
  ]
};
})();
// prettier-ignore
(node/*: any*/).hash = 'b280de21fe28a74a5cbf1c93d3585955';
module.exports = node;
