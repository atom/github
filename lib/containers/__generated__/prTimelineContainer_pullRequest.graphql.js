/**
 * @flow
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteFragment } from 'relay-runtime';
type commitCommentThreadContainer_item$ref = any;
type commitsContainer_nodes$ref = any;
type crossReferencedEventsContainer_nodes$ref = any;
type headRefForcePushedEventContainer_issueish$ref = any;
type headRefForcePushedEventContainer_item$ref = any;
type issueCommentContainer_item$ref = any;
type mergedEventContainer_item$ref = any;
import type { FragmentReference } from "relay-runtime";
declare export opaque type prTimelineContainer_pullRequest$ref: FragmentReference;
export type prTimelineContainer_pullRequest = {|
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
        +$fragmentRefs: commitsContainer_nodes$ref & issueCommentContainer_item$ref & mergedEventContainer_item$ref & headRefForcePushedEventContainer_item$ref & commitCommentThreadContainer_item$ref & crossReferencedEventsContainer_nodes$ref,
      |},
    |}>,
  |},
  +$fragmentRefs: headRefForcePushedEventContainer_issueish$ref,
  +$refType: prTimelineContainer_pullRequest$ref,
|};
*/


const node/*: ConcreteFragment*/ = {
  "kind": "Fragment",
  "name": "prTimelineContainer_pullRequest",
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
      "kind": "FragmentSpread",
      "name": "headRefForcePushedEventContainer_issueish",
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
                  "name": "mergedEventContainer_item",
                  "args": null
                },
                {
                  "kind": "FragmentSpread",
                  "name": "headRefForcePushedEventContainer_item",
                  "args": null
                },
                {
                  "kind": "FragmentSpread",
                  "name": "commitCommentThreadContainer_item",
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
(node/*: any*/).hash = 'ecf0555355586b59e8595a955dcaf5e4';
module.exports = node;
