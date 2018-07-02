/**
 * @flow
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteFragment } from 'relay-runtime';
type commitsView_nodes$ref = any;
type crossReferencedEventsView_nodes$ref = any;
type issueCommentView_item$ref = any;
import type { FragmentReference } from "relay-runtime";
declare export opaque type issueTimelineController_issue$ref: FragmentReference;
export type issueTimelineController_issue = {|
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
        +$fragmentRefs: commitsView_nodes$ref & issueCommentView_item$ref & crossReferencedEventsView_nodes$ref,
      |},
    |}>,
  |},
  +$refType: issueTimelineController_issue$ref,
|};
*/


const node/*: ConcreteFragment*/ = {
  "kind": "Fragment",
  "name": "issueTimelineController_issue",
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
      "name": "__IssueTimelineController_timeline_connection",
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
                  "name": "commitsView_nodes",
                  "args": null
                },
                {
                  "kind": "FragmentSpread",
                  "name": "issueCommentView_item",
                  "args": null
                },
                {
                  "kind": "FragmentSpread",
                  "name": "crossReferencedEventsView_nodes",
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
(node/*: any*/).hash = '91a0aa63cb74691005a4ed6dc3f7aa16';
module.exports = node;
