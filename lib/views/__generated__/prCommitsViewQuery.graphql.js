/**
 * @flow
 * @relayHash 9ab2c8e8a8100e2943c9c25dccc44aa1
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteRequest } from 'relay-runtime';
type prCommitsView_pullRequest$ref = any;
export type prCommitsViewQueryVariables = {|
  commitCount: number,
  commitCursor?: ?string,
  pullRequestId: string,
|};
export type prCommitsViewQueryResponse = {|
  +PullRequest: ?{|
    +$fragmentRefs: prCommitsView_pullRequest$ref
  |}
|};
export type prCommitsViewQuery = {|
  variables: prCommitsViewQueryVariables,
  response: prCommitsViewQueryResponse,
|};
*/


/*
query prCommitsViewQuery(
  $commitCount: Int!
  $commitCursor: String
  $pullRequestId: ID!
) {
  PullRequest: node(id: $pullRequestId) {
    __typename
    ... on PullRequest {
      ...prCommitsView_pullRequest_38TpXw
    }
    id
  }
}

fragment prCommitsView_pullRequest_38TpXw on PullRequest {
  commits(first: $commitCount, after: $commitCursor) {
    pageInfo {
      endCursor
      hasNextPage
    }
    edges {
      cursor
      node {
        commit {
          committer {
            avatarUrl
            name
            date
          }
          messageHeadline
          messageBody
          abbreviatedOid
          url
          id
        }
        id
        __typename
      }
    }
  }
}
*/

const node/*: ConcreteRequest*/ = (function(){
var v0 = [
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
    "kind": "LocalArgument",
    "name": "pullRequestId",
    "type": "ID!",
    "defaultValue": null
  }
],
v1 = [
  {
    "kind": "Variable",
    "name": "id",
    "variableName": "pullRequestId",
    "type": "ID!"
  }
],
v2 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "__typename",
  "args": null,
  "storageKey": null
},
v3 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "id",
  "args": null,
  "storageKey": null
},
v4 = [
  {
    "kind": "Variable",
    "name": "after",
    "variableName": "commitCursor",
    "type": "String"
  },
  {
    "kind": "Variable",
    "name": "first",
    "variableName": "commitCount",
    "type": "Int"
  }
];
return {
  "kind": "Request",
  "operationKind": "query",
  "name": "prCommitsViewQuery",
  "id": null,
  "text": "query prCommitsViewQuery(\n  $commitCount: Int!\n  $commitCursor: String\n  $pullRequestId: ID!\n) {\n  PullRequest: node(id: $pullRequestId) {\n    __typename\n    ... on PullRequest {\n      ...prCommitsView_pullRequest_38TpXw\n    }\n    id\n  }\n}\n\nfragment prCommitsView_pullRequest_38TpXw on PullRequest {\n  commits(first: $commitCount, after: $commitCursor) {\n    pageInfo {\n      endCursor\n      hasNextPage\n    }\n    edges {\n      cursor\n      node {\n        commit {\n          committer {\n            avatarUrl\n            name\n            date\n          }\n          messageHeadline\n          messageBody\n          abbreviatedOid\n          url\n          id\n        }\n        id\n        __typename\n      }\n    }\n  }\n}\n",
  "metadata": {},
  "fragment": {
    "kind": "Fragment",
    "name": "prCommitsViewQuery",
    "type": "Query",
    "metadata": null,
    "argumentDefinitions": v0,
    "selections": [
      {
        "kind": "LinkedField",
        "alias": "PullRequest",
        "name": "node",
        "storageKey": null,
        "args": v1,
        "concreteType": null,
        "plural": false,
        "selections": [
          {
            "kind": "InlineFragment",
            "type": "PullRequest",
            "selections": [
              {
                "kind": "FragmentSpread",
                "name": "prCommitsView_pullRequest",
                "args": [
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
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  "operation": {
    "kind": "Operation",
    "name": "prCommitsViewQuery",
    "argumentDefinitions": v0,
    "selections": [
      {
        "kind": "LinkedField",
        "alias": "PullRequest",
        "name": "node",
        "storageKey": null,
        "args": v1,
        "concreteType": null,
        "plural": false,
        "selections": [
          v2,
          v3,
          {
            "kind": "InlineFragment",
            "type": "PullRequest",
            "selections": [
              {
                "kind": "LinkedField",
                "alias": null,
                "name": "commits",
                "storageKey": null,
                "args": v4,
                "concreteType": "PullRequestCommitConnection",
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
                    "concreteType": "PullRequestCommitEdge",
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
                        "concreteType": "PullRequestCommit",
                        "plural": false,
                        "selections": [
                          {
                            "kind": "LinkedField",
                            "alias": null,
                            "name": "commit",
                            "storageKey": null,
                            "args": null,
                            "concreteType": "Commit",
                            "plural": false,
                            "selections": [
                              {
                                "kind": "LinkedField",
                                "alias": null,
                                "name": "committer",
                                "storageKey": null,
                                "args": null,
                                "concreteType": "GitActor",
                                "plural": false,
                                "selections": [
                                  {
                                    "kind": "ScalarField",
                                    "alias": null,
                                    "name": "avatarUrl",
                                    "args": null,
                                    "storageKey": null
                                  },
                                  {
                                    "kind": "ScalarField",
                                    "alias": null,
                                    "name": "name",
                                    "args": null,
                                    "storageKey": null
                                  },
                                  {
                                    "kind": "ScalarField",
                                    "alias": null,
                                    "name": "date",
                                    "args": null,
                                    "storageKey": null
                                  }
                                ]
                              },
                              {
                                "kind": "ScalarField",
                                "alias": null,
                                "name": "messageHeadline",
                                "args": null,
                                "storageKey": null
                              },
                              {
                                "kind": "ScalarField",
                                "alias": null,
                                "name": "messageBody",
                                "args": null,
                                "storageKey": null
                              },
                              {
                                "kind": "ScalarField",
                                "alias": null,
                                "name": "abbreviatedOid",
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
                              v3
                            ]
                          },
                          v3,
                          v2
                        ]
                      }
                    ]
                  }
                ]
              },
              {
                "kind": "LinkedHandle",
                "alias": null,
                "name": "commits",
                "args": v4,
                "handle": "connection",
                "key": "prCommitsView_commits",
                "filters": null
              }
            ]
          }
        ]
      }
    ]
  }
};
})();
// prettier-ignore
(node/*: any*/).hash = 'be9fe78625905eca8ed496bc1954d20f';
module.exports = node;
