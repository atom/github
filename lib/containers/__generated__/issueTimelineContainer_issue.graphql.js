/**
 * @flow
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteFragment } from 'relay-runtime';
type commitsContainer_nodes$ref = any;
type crossReferencedEventsContainer_nodes$ref = any;
type issueCommentContainer_item$ref = any;
import type { FragmentReference } from "relay-runtime";
declare export opaque type issueTimelineContainer_issue$ref: FragmentReference;
export type issueTimelineContainer_issue = {|
  +url: any,
  +timeline: {|
    +pageInfo: {|
      +endCursor: ?string,
      +hasNextPage: boolean,
    |},
    +edges: ?$ReadOnlyArray<?{|
      +cursor: string,
      +node: ?{|
        +__typename: string,
        +$fragmentRefs: commitsContainer_nodes$ref & issueCommentContainer_item$ref & crossReferencedEventsContainer_nodes$ref,
      |},
    |}>,
  |},
  +$refType: issueTimelineContainer_issue$ref,
|};
*/


const node/*: ConcreteFragment*/ = {
  "kind": "Fragment",
  "name": "issueTimelineContainer_issue",
  "type": "Issue",
  "metadata": {
    "connection": [
      {
        "count": "timelineCount",
        "cursor": "timelineCursor",
        "direction": "forward",
        "path": [
          "timeline"
        ]
      }
    ]
  },
  "argumentDefinitions": [
    {
      "kind": "RootArgument",
      "name": "timelineCount",
      "type": "Int"
    },
    {
      "kind": "RootArgument",
      "name": "timelineCursor",
      "type": "String"
    }
  ],
  "selections": [
    {
      "kind": "ScalarField",
      "alias": null,
      "name": "url",
      "args": null,
      "storageKey": null
    },
    {
      "kind": "LinkedField",
      "alias": "timeline",
      "name": "__IssueTimelineContainer_timeline_connection",
      "storageKey": null,
      "args": null,
      "concreteType": "IssueTimelineConnection",
      "plural": false,
      "selections": [
        {
          "kind": "LinkedField",
          "alias": null,
          "name": "pageInfo",
          "storageKey": null,
          "args": null,
          "concreteType": "PageInfo",
          "plural": false,
          "selections": [
            {
              "kind": "ScalarField",
              "alias": null,
              "name": "endCursor",
              "args": null,
              "storageKey": null
            },
            {
              "kind": "ScalarField",
              "alias": null,
              "name": "hasNextPage",
              "args": null,
              "storageKey": null
            }
          ]
        },
        {
          "kind": "LinkedField",
          "alias": null,
          "name": "edges",
          "storageKey": null,
          "args": null,
          "concreteType": "IssueTimelineItemEdge",
          "plural": true,
          "selections": [
            {
              "kind": "ScalarField",
              "alias": null,
              "name": "cursor",
              "args": null,
              "storageKey": null
            },
            {
              "kind": "LinkedField",
              "alias": null,
              "name": "node",
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
                {
                  "kind": "FragmentSpread",
                  "name": "commitsContainer_nodes",
                  "args": null
                },
                {
                  "kind": "FragmentSpread",
                  "name": "issueCommentContainer_item",
                  "args": null
                },
                {
                  "kind": "FragmentSpread",
                  "name": "crossReferencedEventsContainer_nodes",
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
(node/*: any*/).hash = 'e476783c51f88e5e67a495eb8f4d188f';
module.exports = node;
