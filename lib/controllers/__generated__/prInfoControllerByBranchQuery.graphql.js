/**
 * @flow
 * @relayHash 18c026d709e56e77ed83984855d06f21
 */

/* eslint-disable */

'use strict';

/*::
import type {ConcreteBatch} from 'relay-runtime';
export type prInfoControllerByBranchQueryResponse = {|
  +repository: ?{| |};
|};
*/


/*
query prInfoControllerByBranchQuery(
  $repoOwner: String!
  $repoName: String!
  $branchName: String!
) {
  repository(owner: $repoOwner, name: $repoName) {
    ...prSelectionByBranchContainer_repository
    id
  }
}

fragment prSelectionByBranchContainer_repository on Repository {
  defaultBranchRef {
    name
    id
  }
  pullRequests(first: 30, headRefName: $branchName) {
    totalCount
    edges {
      node {
        id
        number
        title
        url
        ...prInfoContainer_pullRequest
      }
    }
  }
}

fragment prInfoContainer_pullRequest on PullRequest {
  createdAt
  ...prStatusesContainer_pullRequest
  url
  number
  title
  state
  id
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

const batch /*: ConcreteBatch*/ = {
  "fragment": {
    "argumentDefinitions": [
      {
        "kind": "LocalArgument",
        "name": "repoOwner",
        "type": "String!",
        "defaultValue": null
      },
      {
        "kind": "LocalArgument",
        "name": "repoName",
        "type": "String!",
        "defaultValue": null
      },
      {
        "kind": "LocalArgument",
        "name": "branchName",
        "type": "String!",
        "defaultValue": null
      }
    ],
    "kind": "Fragment",
    "metadata": null,
    "name": "prInfoControllerByBranchQuery",
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "args": [
          {
            "kind": "Variable",
            "name": "name",
            "variableName": "repoName",
            "type": "String!"
          },
          {
            "kind": "Variable",
            "name": "owner",
            "variableName": "repoOwner",
            "type": "String!"
          }
        ],
        "concreteType": "Repository",
        "name": "repository",
        "plural": false,
        "selections": [
          {
            "kind": "FragmentSpread",
            "name": "prSelectionByBranchContainer_repository",
            "args": null
          }
        ],
        "storageKey": null
      }
    ],
    "type": "Query"
  },
  "id": null,
  "kind": "Batch",
  "metadata": {},
  "name": "prInfoControllerByBranchQuery",
  "query": {
    "argumentDefinitions": [
      {
        "kind": "LocalArgument",
        "name": "repoOwner",
        "type": "String!",
        "defaultValue": null
      },
      {
        "kind": "LocalArgument",
        "name": "repoName",
        "type": "String!",
        "defaultValue": null
      },
      {
        "kind": "LocalArgument",
        "name": "branchName",
        "type": "String!",
        "defaultValue": null
      }
    ],
    "kind": "Root",
    "name": "prInfoControllerByBranchQuery",
    "operation": "query",
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "args": [
          {
            "kind": "Variable",
            "name": "name",
            "variableName": "repoName",
            "type": "String!"
          },
          {
            "kind": "Variable",
            "name": "owner",
            "variableName": "repoOwner",
            "type": "String!"
          }
        ],
        "concreteType": "Repository",
        "name": "repository",
        "plural": false,
        "selections": [
          {
            "kind": "LinkedField",
            "alias": null,
            "args": null,
            "concreteType": "Ref",
            "name": "defaultBranchRef",
            "plural": false,
            "selections": [
              {
                "kind": "ScalarField",
                "alias": null,
                "args": null,
                "name": "name",
                "storageKey": null
              },
              {
                "kind": "ScalarField",
                "alias": null,
                "args": null,
                "name": "id",
                "storageKey": null
              }
            ],
            "storageKey": null
          },
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
                        "kind": "LinkedField",
                        "alias": null,
                        "args": [
                          {
                            "kind": "Literal",
                            "name": "last",
                            "value": 1,
                            "type": "Int"
                          }
                        ],
                        "concreteType": "PullRequestCommitConnection",
                        "name": "commits",
                        "plural": false,
                        "selections": [
                          {
                            "kind": "LinkedField",
                            "alias": null,
                            "args": null,
                            "concreteType": "PullRequestCommitEdge",
                            "name": "edges",
                            "plural": true,
                            "selections": [
                              {
                                "kind": "LinkedField",
                                "alias": null,
                                "args": null,
                                "concreteType": "PullRequestCommit",
                                "name": "node",
                                "plural": false,
                                "selections": [
                                  {
                                    "kind": "LinkedField",
                                    "alias": null,
                                    "args": null,
                                    "concreteType": "Commit",
                                    "name": "commit",
                                    "plural": false,
                                    "selections": [
                                      {
                                        "kind": "LinkedField",
                                        "alias": null,
                                        "args": null,
                                        "concreteType": "Status",
                                        "name": "status",
                                        "plural": false,
                                        "selections": [
                                          {
                                            "kind": "ScalarField",
                                            "alias": null,
                                            "args": null,
                                            "name": "state",
                                            "storageKey": null
                                          },
                                          {
                                            "kind": "LinkedField",
                                            "alias": null,
                                            "args": null,
                                            "concreteType": "StatusContext",
                                            "name": "contexts",
                                            "plural": true,
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
                                                "name": "state",
                                                "storageKey": null
                                              },
                                              {
                                                "kind": "InlineFragment",
                                                "type": "StatusContext",
                                                "selections": [
                                                  {
                                                    "kind": "ScalarField",
                                                    "alias": null,
                                                    "args": null,
                                                    "name": "context",
                                                    "storageKey": null
                                                  },
                                                  {
                                                    "kind": "ScalarField",
                                                    "alias": null,
                                                    "args": null,
                                                    "name": "description",
                                                    "storageKey": null
                                                  },
                                                  {
                                                    "kind": "ScalarField",
                                                    "alias": null,
                                                    "args": null,
                                                    "name": "targetUrl",
                                                    "storageKey": null
                                                  }
                                                ]
                                              }
                                            ],
                                            "storageKey": null
                                          },
                                          {
                                            "kind": "ScalarField",
                                            "alias": null,
                                            "args": null,
                                            "name": "id",
                                            "storageKey": null
                                          }
                                        ],
                                        "storageKey": null
                                      },
                                      {
                                        "kind": "ScalarField",
                                        "alias": null,
                                        "args": null,
                                        "name": "id",
                                        "storageKey": null
                                      }
                                    ],
                                    "storageKey": null
                                  },
                                  {
                                    "kind": "ScalarField",
                                    "alias": null,
                                    "args": null,
                                    "name": "id",
                                    "storageKey": null
                                  }
                                ],
                                "storageKey": null
                              }
                            ],
                            "storageKey": null
                          }
                        ],
                        "storageKey": "commits{\"last\":1}"
                      },
                      {
                        "kind": "ScalarField",
                        "alias": null,
                        "args": null,
                        "name": "state",
                        "storageKey": null
                      },
                      {
                        "kind": "ScalarField",
                        "alias": null,
                        "args": null,
                        "name": "createdAt",
                        "storageKey": null
                      },
                      {
                        "kind": "LinkedField",
                        "alias": null,
                        "args": null,
                        "concreteType": null,
                        "name": "author",
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
                            "kind": "ScalarField",
                            "alias": null,
                            "args": null,
                            "name": "login",
                            "storageKey": null
                          },
                          {
                            "kind": "ScalarField",
                            "alias": null,
                            "args": null,
                            "name": "avatarUrl",
                            "storageKey": null
                          },
                          {
                            "kind": "ScalarField",
                            "alias": null,
                            "args": null,
                            "name": "id",
                            "storageKey": null
                          },
                          {
                            "kind": "InlineFragment",
                            "type": "Bot",
                            "selections": [
                              {
                                "kind": "ScalarField",
                                "alias": null,
                                "args": null,
                                "name": "url",
                                "storageKey": null
                              }
                            ]
                          },
                          {
                            "kind": "InlineFragment",
                            "type": "User",
                            "selections": [
                              {
                                "kind": "ScalarField",
                                "alias": null,
                                "args": null,
                                "name": "url",
                                "storageKey": null
                              }
                            ]
                          }
                        ],
                        "storageKey": null
                      },
                      {
                        "kind": "LinkedField",
                        "alias": null,
                        "args": null,
                        "concreteType": "Repository",
                        "name": "repository",
                        "plural": false,
                        "selections": [
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
                                "name": "__typename",
                                "storageKey": null
                              },
                              {
                                "kind": "ScalarField",
                                "alias": null,
                                "args": null,
                                "name": "login",
                                "storageKey": null
                              },
                              {
                                "kind": "ScalarField",
                                "alias": null,
                                "args": null,
                                "name": "id",
                                "storageKey": null
                              }
                            ],
                            "storageKey": null
                          },
                          {
                            "kind": "ScalarField",
                            "alias": null,
                            "args": null,
                            "name": "id",
                            "storageKey": null
                          }
                        ],
                        "storageKey": null
                      },
                      {
                        "kind": "LinkedField",
                        "alias": null,
                        "args": null,
                        "concreteType": "ReactionGroup",
                        "name": "reactionGroups",
                        "plural": true,
                        "selections": [
                          {
                            "kind": "ScalarField",
                            "alias": null,
                            "args": null,
                            "name": "content",
                            "storageKey": null
                          },
                          {
                            "kind": "LinkedField",
                            "alias": null,
                            "args": null,
                            "concreteType": "ReactingUserConnection",
                            "name": "users",
                            "plural": false,
                            "selections": [
                              {
                                "kind": "ScalarField",
                                "alias": null,
                                "args": null,
                                "name": "totalCount",
                                "storageKey": null
                              }
                            ],
                            "storageKey": null
                          }
                        ],
                        "storageKey": null
                      },
                      {
                        "kind": "LinkedField",
                        "alias": "commitsCount",
                        "args": null,
                        "concreteType": "PullRequestCommitConnection",
                        "name": "commits",
                        "plural": false,
                        "selections": [
                          {
                            "kind": "ScalarField",
                            "alias": null,
                            "args": null,
                            "name": "totalCount",
                            "storageKey": null
                          }
                        ],
                        "storageKey": null
                      },
                      {
                        "kind": "LinkedField",
                        "alias": null,
                        "args": [
                          {
                            "kind": "Literal",
                            "name": "first",
                            "value": 100,
                            "type": "Int"
                          }
                        ],
                        "concreteType": "LabelConnection",
                        "name": "labels",
                        "plural": false,
                        "selections": [
                          {
                            "kind": "LinkedField",
                            "alias": null,
                            "args": null,
                            "concreteType": "LabelEdge",
                            "name": "edges",
                            "plural": true,
                            "selections": [
                              {
                                "kind": "LinkedField",
                                "alias": null,
                                "args": null,
                                "concreteType": "Label",
                                "name": "node",
                                "plural": false,
                                "selections": [
                                  {
                                    "kind": "ScalarField",
                                    "alias": null,
                                    "args": null,
                                    "name": "name",
                                    "storageKey": null
                                  },
                                  {
                                    "kind": "ScalarField",
                                    "alias": null,
                                    "args": null,
                                    "name": "color",
                                    "storageKey": null
                                  },
                                  {
                                    "kind": "ScalarField",
                                    "alias": null,
                                    "args": null,
                                    "name": "id",
                                    "storageKey": null
                                  }
                                ],
                                "storageKey": null
                              }
                            ],
                            "storageKey": null
                          }
                        ],
                        "storageKey": "labels{\"first\":100}"
                      }
                    ],
                    "storageKey": null
                  }
                ],
                "storageKey": null
              }
            ],
            "storageKey": null
          },
          {
            "kind": "ScalarField",
            "alias": null,
            "args": null,
            "name": "id",
            "storageKey": null
          }
        ],
        "storageKey": null
      }
    ]
  },
  "text": "query prInfoControllerByBranchQuery(\n  $repoOwner: String!\n  $repoName: String!\n  $branchName: String!\n) {\n  repository(owner: $repoOwner, name: $repoName) {\n    ...prSelectionByBranchContainer_repository\n    id\n  }\n}\n\nfragment prSelectionByBranchContainer_repository on Repository {\n  defaultBranchRef {\n    name\n    id\n  }\n  pullRequests(first: 30, headRefName: $branchName) {\n    totalCount\n    edges {\n      node {\n        id\n        number\n        title\n        url\n        ...prInfoContainer_pullRequest\n      }\n    }\n  }\n}\n\nfragment prInfoContainer_pullRequest on PullRequest {\n  createdAt\n  ...prStatusesContainer_pullRequest\n  url\n  number\n  title\n  state\n  id\n  author {\n    __typename\n    login\n    avatarUrl\n    ... on User {\n      url\n    }\n    ... on Bot {\n      url\n    }\n    ... on Node {\n      id\n    }\n  }\n  repository {\n    name\n    owner {\n      __typename\n      login\n      id\n    }\n    id\n  }\n  reactionGroups {\n    content\n    users {\n      totalCount\n    }\n  }\n  commitsCount: commits {\n    totalCount\n  }\n  labels(first: 100) {\n    edges {\n      node {\n        name\n        color\n        id\n      }\n    }\n  }\n}\n\nfragment prStatusesContainer_pullRequest on PullRequest {\n  id\n  commits(last: 1) {\n    edges {\n      node {\n        commit {\n          status {\n            state\n            contexts {\n              id\n              state\n              ...prStatusContextContainer_context\n            }\n            id\n          }\n          id\n        }\n        id\n      }\n    }\n  }\n}\n\nfragment prStatusContextContainer_context on StatusContext {\n  context\n  description\n  state\n  targetUrl\n}\n"
};

module.exports = batch;
