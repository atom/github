/**
 * @flow
 * @relayHash 52a8f3e234b61e95dabaad1a37132167
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteRequest } from 'relay-runtime';
type prInfoContainer_pullRequest$ref = any;
export type prInfoContainerRefetchQueryVariables = {|
  id: string
|};
export type prInfoContainerRefetchQueryResponse = {|
  +pullRequest: ?{|
    +$fragmentRefs: prInfoContainer_pullRequest$ref
  |}
|};
*/


/*
query prInfoContainerRefetchQuery(
  $id: ID!
) {
  pullRequest: node(id: $id) {
    __typename
    ... on PullRequest {
      ...prInfoContainer_pullRequest
    }
    id
  }
}

fragment prInfoContainer_pullRequest on PullRequest {
  ...prStatusesContainer_pullRequest
  id
  url
  number
  title
  state
  createdAt
  author {
    __typename
    login
    avatarUrl
    ... on User {
      url
    }
    ... on Bot {
      url
    }
    ... on Node {
      id
    }
  }
  repository {
    name
    owner {
      __typename
      login
      id
    }
    id
  }
  reactionGroups {
    content
    users {
      totalCount
    }
  }
  commitsCount: commits {
    totalCount
  }
  labels(first: 100) {
    edges {
      node {
        name
        color
        id
      }
    }
  }
}

fragment prStatusesContainer_pullRequest on PullRequest {
  id
  commits(last: 1) {
    edges {
      node {
        commit {
          status {
            state
            contexts {
              id
              state
              ...prStatusContextContainer_context
            }
            id
          }
          id
        }
        id
      }
    }
  }
}

fragment prStatusContextContainer_context on StatusContext {
  context
  description
  state
  targetUrl
}
*/

const node/*: ConcreteRequest*/ = (function(){
var v0 = [
  {
    "kind": "LocalArgument",
    "name": "id",
    "type": "ID!",
    "defaultValue": null
  }
],
v1 = [
  {
    "kind": "Variable",
    "name": "id",
    "variableName": "id",
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
v4 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "url",
  "args": null,
  "storageKey": null
},
v5 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "state",
  "args": null,
  "storageKey": null
},
v6 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "login",
  "args": null,
  "storageKey": null
},
v7 = [
  v4
],
v8 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "name",
  "args": null,
  "storageKey": null
},
v9 = [
  {
    "kind": "ScalarField",
    "alias": null,
    "name": "totalCount",
    "args": null,
    "storageKey": null
  }
];
return {
  "kind": "Request",
  "operationKind": "query",
  "name": "prInfoContainerRefetchQuery",
  "id": null,
  "text": "query prInfoContainerRefetchQuery(\n  $id: ID!\n) {\n  pullRequest: node(id: $id) {\n    __typename\n    ... on PullRequest {\n      ...prInfoContainer_pullRequest\n    }\n    id\n  }\n}\n\nfragment prInfoContainer_pullRequest on PullRequest {\n  ...prStatusesContainer_pullRequest\n  id\n  url\n  number\n  title\n  state\n  createdAt\n  author {\n    __typename\n    login\n    avatarUrl\n    ... on User {\n      url\n    }\n    ... on Bot {\n      url\n    }\n    ... on Node {\n      id\n    }\n  }\n  repository {\n    name\n    owner {\n      __typename\n      login\n      id\n    }\n    id\n  }\n  reactionGroups {\n    content\n    users {\n      totalCount\n    }\n  }\n  commitsCount: commits {\n    totalCount\n  }\n  labels(first: 100) {\n    edges {\n      node {\n        name\n        color\n        id\n      }\n    }\n  }\n}\n\nfragment prStatusesContainer_pullRequest on PullRequest {\n  id\n  commits(last: 1) {\n    edges {\n      node {\n        commit {\n          status {\n            state\n            contexts {\n              id\n              state\n              ...prStatusContextContainer_context\n            }\n            id\n          }\n          id\n        }\n        id\n      }\n    }\n  }\n}\n\nfragment prStatusContextContainer_context on StatusContext {\n  context\n  description\n  state\n  targetUrl\n}\n",
  "metadata": {},
  "fragment": {
    "kind": "Fragment",
    "name": "prInfoContainerRefetchQuery",
    "type": "Query",
    "metadata": null,
    "argumentDefinitions": v0,
    "selections": [
      {
        "kind": "LinkedField",
        "alias": "pullRequest",
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
                "name": "prInfoContainer_pullRequest",
                "args": null
              }
            ]
          }
        ]
      }
    ]
  },
  "operation": {
    "kind": "Operation",
    "name": "prInfoContainerRefetchQuery",
    "argumentDefinitions": v0,
    "selections": [
      {
        "kind": "LinkedField",
        "alias": "pullRequest",
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
                "kind": "ScalarField",
                "alias": null,
                "name": "createdAt",
                "args": null,
                "storageKey": null
              },
              v4,
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
              v5,
              {
                "kind": "LinkedField",
                "alias": null,
                "name": "commits",
                "storageKey": "commits(last:1)",
                "args": [
                  {
                    "kind": "Literal",
                    "name": "last",
                    "value": 1,
                    "type": "Int"
                  }
                ],
                "concreteType": "PullRequestCommitConnection",
                "plural": false,
                "selections": [
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
                                "name": "status",
                                "storageKey": null,
                                "args": null,
                                "concreteType": "Status",
                                "plural": false,
                                "selections": [
                                  v5,
                                  {
                                    "kind": "LinkedField",
                                    "alias": null,
                                    "name": "contexts",
                                    "storageKey": null,
                                    "args": null,
                                    "concreteType": "StatusContext",
                                    "plural": true,
                                    "selections": [
                                      v3,
                                      v5,
                                      {
                                        "kind": "ScalarField",
                                        "alias": null,
                                        "name": "context",
                                        "args": null,
                                        "storageKey": null
                                      },
                                      {
                                        "kind": "ScalarField",
                                        "alias": null,
                                        "name": "description",
                                        "args": null,
                                        "storageKey": null
                                      },
                                      {
                                        "kind": "ScalarField",
                                        "alias": null,
                                        "name": "targetUrl",
                                        "args": null,
                                        "storageKey": null
                                      }
                                    ]
                                  },
                                  v3
                                ]
                              },
                              v3
                            ]
                          },
                          v3
                        ]
                      }
                    ]
                  }
                ]
              },
              {
                "kind": "LinkedField",
                "alias": null,
                "name": "author",
                "storageKey": null,
                "args": null,
                "concreteType": null,
                "plural": false,
                "selections": [
                  v2,
                  v6,
                  {
                    "kind": "ScalarField",
                    "alias": null,
                    "name": "avatarUrl",
                    "args": null,
                    "storageKey": null
                  },
                  v3,
                  {
                    "kind": "InlineFragment",
                    "type": "Bot",
                    "selections": v7
                  },
                  {
                    "kind": "InlineFragment",
                    "type": "User",
                    "selections": v7
                  }
                ]
              },
              {
                "kind": "LinkedField",
                "alias": null,
                "name": "repository",
                "storageKey": null,
                "args": null,
                "concreteType": "Repository",
                "plural": false,
                "selections": [
                  v8,
                  {
                    "kind": "LinkedField",
                    "alias": null,
                    "name": "owner",
                    "storageKey": null,
                    "args": null,
                    "concreteType": null,
                    "plural": false,
                    "selections": [
                      v2,
                      v6,
                      v3
                    ]
                  },
                  v3
                ]
              },
              {
                "kind": "LinkedField",
                "alias": null,
                "name": "reactionGroups",
                "storageKey": null,
                "args": null,
                "concreteType": "ReactionGroup",
                "plural": true,
                "selections": [
                  {
                    "kind": "ScalarField",
                    "alias": null,
                    "name": "content",
                    "args": null,
                    "storageKey": null
                  },
                  {
                    "kind": "LinkedField",
                    "alias": null,
                    "name": "users",
                    "storageKey": null,
                    "args": null,
                    "concreteType": "ReactingUserConnection",
                    "plural": false,
                    "selections": v9
                  }
                ]
              },
              {
                "kind": "LinkedField",
                "alias": "commitsCount",
                "name": "commits",
                "storageKey": null,
                "args": null,
                "concreteType": "PullRequestCommitConnection",
                "plural": false,
                "selections": v9
              },
              {
                "kind": "LinkedField",
                "alias": null,
                "name": "labels",
                "storageKey": "labels(first:100)",
                "args": [
                  {
                    "kind": "Literal",
                    "name": "first",
                    "value": 100,
                    "type": "Int"
                  }
                ],
                "concreteType": "LabelConnection",
                "plural": false,
                "selections": [
                  {
                    "kind": "LinkedField",
                    "alias": null,
                    "name": "edges",
                    "storageKey": null,
                    "args": null,
                    "concreteType": "LabelEdge",
                    "plural": true,
                    "selections": [
                      {
                        "kind": "LinkedField",
                        "alias": null,
                        "name": "node",
                        "storageKey": null,
                        "args": null,
                        "concreteType": "Label",
                        "plural": false,
                        "selections": [
                          v8,
                          {
                            "kind": "ScalarField",
                            "alias": null,
                            "name": "color",
                            "args": null,
                            "storageKey": null
                          },
                          v3
                        ]
                      }
                    ]
                  }
                ]
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
(node/*: any*/).hash = 'ef75b0c0aad4b29aad4e7759ffc27a76';
module.exports = node;
