/**
 * @flow
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteFragment } from 'relay-runtime';
type commitCommentThreadView_item$ref = any;
type commitsView_nodes$ref = any;
type crossReferencedEventsView_nodes$ref = any;
type headRefForcePushedEventView_issueish$ref = any;
type headRefForcePushedEventView_item$ref = any;
type issueCommentView_item$ref = any;
type mergedEventView_item$ref = any;
import type { FragmentReference } from "relay-runtime";
declare export opaque type prTimelineController_pullRequest$ref: FragmentReference;
export type prTimelineController_pullRequest = {|
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
        +$fragmentRefs: commitsView_nodes$ref & issueCommentView_item$ref & mergedEventView_item$ref & headRefForcePushedEventView_item$ref & commitCommentThreadView_item$ref & crossReferencedEventsView_nodes$ref,
      |},
    |}>,
  |},
  +$fragmentRefs: headRefForcePushedEventView_issueish$ref,
  +$refType: prTimelineController_pullRequest$ref,
|};
*/


const node/*: ConcreteFragment*/ = {
  "kind": "Fragment",
  "name": "prTimelineController_pullRequest",
  "type": "PullRequest",
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
      "type": "Int!",
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
      "kind": "FragmentSpread",
      "name": "headRefForcePushedEventView_issueish",
      "args": null
    },
    {
      "kind": "LinkedField",
      "alias": "timeline",
      "name": "__prTimelineContainer_timeline_connection",
      "storageKey": null,
      "args": null,
      "concreteType": "PullRequestTimelineConnection",
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
          "concreteType": "PullRequestTimelineItemEdge",
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
                  "name": "mergedEventView_item",
                  "args": null
                },
                {
                  "kind": "FragmentSpread",
                  "name": "headRefForcePushedEventView_item",
                  "args": null
                },
                {
                  "kind": "FragmentSpread",
                  "name": "commitCommentThreadView_item",
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
(node/*: any*/).hash = '237e6c0f8794b6f7065f0bbd7a417f99';
module.exports = node;
