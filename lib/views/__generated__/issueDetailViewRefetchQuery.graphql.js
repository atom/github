/**
 * @flow
 * @relayHash 0de8f3b80a7115e2fb90301e39c4591d
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteRequest } from 'relay-runtime';
type issueDetailView_issue$ref = any;
type issueDetailView_repository$ref = any;
export type issueDetailViewRefetchQueryVariables = {|
  repoId: string,
  issueishId: string,
  timelineCount: number,
  timelineCursor?: ?string,
|};
export type issueDetailViewRefetchQueryResponse = {|
  +repository: ?{|
    +$fragmentRefs: issueDetailView_repository$ref
  |},
  +issue: ?{|
    +$fragmentRefs: issueDetailView_issue$ref
  |},
|};
export type issueDetailViewRefetchQuery = {|
  variables: issueDetailViewRefetchQueryVariables,
  response: issueDetailViewRefetchQueryResponse,
|};
*/


/*
query issueDetailViewRefetchQuery(
  $repoId: ID!
  $issueishId: ID!
  $timelineCount: Int!
  $timelineCursor: String
) {
  repository: node(id: $repoId) {
    __typename
    ...issueDetailView_repository_3D8CP9
    id
  }
  issue: node(id: $issueishId) {
    __typename
    ...issueDetailView_issue_3D8CP9
    id
  }
}

fragment issueDetailView_repository_3D8CP9 on Repository {
  id
  name
  owner {
    __typename
    login
    id
  }
}

fragment issueDetailView_issue_3D8CP9 on Issue {
  __typename
  ... on Node {
    id
  }
  state
  number
  title
  bodyHTML
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
  ...issueTimelineController_issue_3D8CP9
  ... on UniformResourceLocatable {
    url
  }
  ... on Reactable {
    reactionGroups {
      content
      users {
        totalCount
      }
    }
  }
}

fragment issueTimelineController_issue_3D8CP9 on Issue {
  url
  timeline(first: $timelineCount, after: $timelineCursor) {
    pageInfo {
      endCursor
      hasNextPage
    }
    edges {
      cursor
      node {
        __typename
        ...commitsView_nodes
        ...issueCommentView_item
        ...crossReferencedEventsView_nodes
        ... on Node {
          id
        }
      }
    }
  }
}

fragment commitsView_nodes on Commit {
  id
  author {
    name
    user {
      login
      id
    }
  }
  ...commitView_commit
}

fragment issueCommentView_item on IssueComment {
  author {
    __typename
    avatarUrl
    login
    ... on Node {
      id
    }
  }
  bodyHTML
  createdAt
  url
}

fragment crossReferencedEventsView_nodes on CrossReferencedEvent {
  id
  referencedAt
  isCrossRepository
  actor {
    __typename
    login
    avatarUrl
    ... on Node {
      id
    }
  }
  source {
    __typename
    ... on RepositoryNode {
      repository {
        name
        owner {
          __typename
          login
          id
        }
        id
      }
    }
    ... on Node {
      id
    }
  }
  ...crossReferencedEventView_item
}

fragment crossReferencedEventView_item on CrossReferencedEvent {
  id
  isCrossRepository
  source {
    __typename
    ... on Issue {
      number
      title
      url
      issueState: state
    }
    ... on PullRequest {
      number
      title
      url
      prState: state
    }
    ... on RepositoryNode {
      repository {
        name
        isPrivate
        owner {
          __typename
          login
          id
        }
        id
      }
    }
    ... on Node {
      id
    }
  }
}

fragment commitView_commit on Commit {
  author {
    name
    avatarUrl
    user {
      login
      id
    }
  }
  committer {
    name
    avatarUrl
    user {
      login
      id
    }
  }
  authoredByCommitter
  sha: oid
  message
  messageHeadlineHTML
  commitUrl
}
*/

const node/*: ConcreteRequest*/ = (function(){
var v0 = [
  {
    "kind": "LocalArgument",
    "name": "repoId",
    "type": "ID!",
    "defaultValue": null
  },
  {
    "kind": "LocalArgument",
    "name": "issueishId",
    "type": "ID!",
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
  }
],
v1 = [
  {
    "kind": "Variable",
    "name": "id",
    "variableName": "repoId",
    "type": "ID!"
  }
],
v2 = [
  {
    "kind": "Variable",
    "name": "timelineCount",
    "variableName": "timelineCount",
    "type": null
  },
  {
    "kind": "Variable",
    "name": "timelineCursor",
    "variableName": "timelineCursor",
    "type": null
  }
],
v3 = [
  {
    "kind": "Variable",
    "name": "id",
    "variableName": "issueishId",
    "type": "ID!"
  }
],
v4 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "__typename",
  "args": null,
  "storageKey": null
},
v5 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "id",
  "args": null,
  "storageKey": null
},
v6 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "name",
  "args": null,
  "storageKey": null
},
v7 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "login",
  "args": null,
  "storageKey": null
},
v8 = {
  "kind": "LinkedField",
  "alias": null,
  "name": "owner",
  "storageKey": null,
  "args": null,
  "concreteType": null,
  "plural": false,
  "selections": [
    v4,
    v7,
    v5
  ]
},
v9 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "number",
  "args": null,
  "storageKey": null
},
v10 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "title",
  "args": null,
  "storageKey": null
},
v11 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "bodyHTML",
  "args": null,
  "storageKey": null
},
v12 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "avatarUrl",
  "args": null,
  "storageKey": null
},
v13 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "url",
  "args": null,
  "storageKey": null
},
v14 = [
  v13
],
v15 = [
  {
    "kind": "Variable",
    "name": "after",
    "variableName": "timelineCursor",
    "type": "String"
  },
  {
    "kind": "Variable",
    "name": "first",
    "variableName": "timelineCount",
    "type": "Int"
  }
],
v16 = {
  "kind": "LinkedField",
  "alias": null,
  "name": "user",
  "storageKey": null,
  "args": null,
  "concreteType": "User",
  "plural": false,
  "selections": [
    v7,
    v5
  ]
};
return {
  "kind": "Request",
  "operationKind": "query",
  "name": "issueDetailViewRefetchQuery",
  "id": null,
  "text": "query issueDetailViewRefetchQuery(\n  $repoId: ID!\n  $issueishId: ID!\n  $timelineCount: Int!\n  $timelineCursor: String\n) {\n  repository: node(id: $repoId) {\n    __typename\n    ...issueDetailView_repository_3D8CP9\n    id\n  }\n  issue: node(id: $issueishId) {\n    __typename\n    ...issueDetailView_issue_3D8CP9\n    id\n  }\n}\n\nfragment issueDetailView_repository_3D8CP9 on Repository {\n  id\n  name\n  owner {\n    __typename\n    login\n    id\n  }\n}\n\nfragment issueDetailView_issue_3D8CP9 on Issue {\n  __typename\n  ... on Node {\n    id\n  }\n  state\n  number\n  title\n  bodyHTML\n  author {\n    __typename\n    login\n    avatarUrl\n    ... on User {\n      url\n    }\n    ... on Bot {\n      url\n    }\n    ... on Node {\n      id\n    }\n  }\n  ...issueTimelineController_issue_3D8CP9\n  ... on UniformResourceLocatable {\n    url\n  }\n  ... on Reactable {\n    reactionGroups {\n      content\n      users {\n        totalCount\n      }\n    }\n  }\n}\n\nfragment issueTimelineController_issue_3D8CP9 on Issue {\n  url\n  timeline(first: $timelineCount, after: $timelineCursor) {\n    pageInfo {\n      endCursor\n      hasNextPage\n    }\n    edges {\n      cursor\n      node {\n        __typename\n        ...commitsView_nodes\n        ...issueCommentView_item\n        ...crossReferencedEventsView_nodes\n        ... on Node {\n          id\n        }\n      }\n    }\n  }\n}\n\nfragment commitsView_nodes on Commit {\n  id\n  author {\n    name\n    user {\n      login\n      id\n    }\n  }\n  ...commitView_commit\n}\n\nfragment issueCommentView_item on IssueComment {\n  author {\n    __typename\n    avatarUrl\n    login\n    ... on Node {\n      id\n    }\n  }\n  bodyHTML\n  createdAt\n  url\n}\n\nfragment crossReferencedEventsView_nodes on CrossReferencedEvent {\n  id\n  referencedAt\n  isCrossRepository\n  actor {\n    __typename\n    login\n    avatarUrl\n    ... on Node {\n      id\n    }\n  }\n  source {\n    __typename\n    ... on RepositoryNode {\n      repository {\n        name\n        owner {\n          __typename\n          login\n          id\n        }\n        id\n      }\n    }\n    ... on Node {\n      id\n    }\n  }\n  ...crossReferencedEventView_item\n}\n\nfragment crossReferencedEventView_item on CrossReferencedEvent {\n  id\n  isCrossRepository\n  source {\n    __typename\n    ... on Issue {\n      number\n      title\n      url\n      issueState: state\n    }\n    ... on PullRequest {\n      number\n      title\n      url\n      prState: state\n    }\n    ... on RepositoryNode {\n      repository {\n        name\n        isPrivate\n        owner {\n          __typename\n          login\n          id\n        }\n        id\n      }\n    }\n    ... on Node {\n      id\n    }\n  }\n}\n\nfragment commitView_commit on Commit {\n  author {\n    name\n    avatarUrl\n    user {\n      login\n      id\n    }\n  }\n  committer {\n    name\n    avatarUrl\n    user {\n      login\n      id\n    }\n  }\n  authoredByCommitter\n  sha: oid\n  message\n  messageHeadlineHTML\n  commitUrl\n}\n",
  "metadata": {},
  "fragment": {
    "kind": "Fragment",
    "name": "issueDetailViewRefetchQuery",
    "type": "Query",
    "metadata": null,
    "argumentDefinitions": v0,
    "selections": [
      {
        "kind": "LinkedField",
        "alias": "repository",
        "name": "node",
        "storageKey": null,
        "args": v1,
        "concreteType": null,
        "plural": false,
        "selections": [
          {
            "kind": "FragmentSpread",
            "name": "issueDetailView_repository",
            "args": v2
          }
        ]
      },
      {
        "kind": "LinkedField",
        "alias": "issue",
        "name": "node",
        "storageKey": null,
        "args": v3,
        "concreteType": null,
        "plural": false,
        "selections": [
          {
            "kind": "FragmentSpread",
            "name": "issueDetailView_issue",
            "args": v2
          }
        ]
      }
    ]
  },
  "operation": {
    "kind": "Operation",
    "name": "issueDetailViewRefetchQuery",
    "argumentDefinitions": v0,
    "selections": [
      {
        "kind": "LinkedField",
        "alias": "repository",
        "name": "node",
        "storageKey": null,
        "args": v1,
        "concreteType": null,
        "plural": false,
        "selections": [
          v4,
          v5,
          {
            "kind": "InlineFragment",
            "type": "Repository",
            "selections": [
              v6,
              v8
            ]
          }
        ]
      },
      {
        "kind": "LinkedField",
        "alias": "issue",
        "name": "node",
        "storageKey": null,
        "args": v3,
        "concreteType": null,
        "plural": false,
        "selections": [
          v4,
          v5,
          {
            "kind": "InlineFragment",
            "type": "Issue",
            "selections": [
              v4,
              {
                "kind": "ScalarField",
                "alias": null,
                "name": "state",
                "args": null,
                "storageKey": null
              },
              v9,
              v10,
              v11,
              {
                "kind": "LinkedField",
                "alias": null,
                "name": "author",
                "storageKey": null,
                "args": null,
                "concreteType": null,
                "plural": false,
                "selections": [
                  v4,
                  v7,
                  v12,
                  v5,
                  {
                    "kind": "InlineFragment",
                    "type": "Bot",
                    "selections": v14
                  },
                  {
                    "kind": "InlineFragment",
                    "type": "User",
                    "selections": v14
                  }
                ]
              },
              v13,
              {
                "kind": "LinkedField",
                "alias": null,
                "name": "timeline",
                "storageKey": null,
                "args": v15,
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
                          v4,
                          v5,
                          {
                            "kind": "InlineFragment",
                            "type": "CrossReferencedEvent",
                            "selections": [
                              {
                                "kind": "ScalarField",
                                "alias": null,
                                "name": "referencedAt",
                                "args": null,
                                "storageKey": null
                              },
                              {
                                "kind": "ScalarField",
                                "alias": null,
                                "name": "isCrossRepository",
                                "args": null,
                                "storageKey": null
                              },
                              {
                                "kind": "LinkedField",
                                "alias": null,
                                "name": "actor",
                                "storageKey": null,
                                "args": null,
                                "concreteType": null,
                                "plural": false,
                                "selections": [
                                  v4,
                                  v7,
                                  v12,
                                  v5
                                ]
                              },
                              {
                                "kind": "LinkedField",
                                "alias": null,
                                "name": "source",
                                "storageKey": null,
                                "args": null,
                                "concreteType": null,
                                "plural": false,
                                "selections": [
                                  v4,
                                  {
                                    "kind": "LinkedField",
                                    "alias": null,
                                    "name": "repository",
                                    "storageKey": null,
                                    "args": null,
                                    "concreteType": "Repository",
                                    "plural": false,
                                    "selections": [
                                      v6,
                                      v8,
                                      v5,
                                      {
                                        "kind": "ScalarField",
                                        "alias": null,
                                        "name": "isPrivate",
                                        "args": null,
                                        "storageKey": null
                                      }
                                    ]
                                  },
                                  v5,
                                  {
                                    "kind": "InlineFragment",
                                    "type": "PullRequest",
                                    "selections": [
                                      v9,
                                      v10,
                                      v13,
                                      {
                                        "kind": "ScalarField",
                                        "alias": "prState",
                                        "name": "state",
                                        "args": null,
                                        "storageKey": null
                                      }
                                    ]
                                  },
                                  {
                                    "kind": "InlineFragment",
                                    "type": "Issue",
                                    "selections": [
                                      v9,
                                      v10,
                                      v13,
                                      {
                                        "kind": "ScalarField",
                                        "alias": "issueState",
                                        "name": "state",
                                        "args": null,
                                        "storageKey": null
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          },
                          {
                            "kind": "InlineFragment",
                            "type": "IssueComment",
                            "selections": [
                              {
                                "kind": "LinkedField",
                                "alias": null,
                                "name": "author",
                                "storageKey": null,
                                "args": null,
                                "concreteType": null,
                                "plural": false,
                                "selections": [
                                  v4,
                                  v12,
                                  v7,
                                  v5
                                ]
                              },
                              v11,
                              {
                                "kind": "ScalarField",
                                "alias": null,
                                "name": "createdAt",
                                "args": null,
                                "storageKey": null
                              },
                              v13
                            ]
                          },
                          {
                            "kind": "InlineFragment",
                            "type": "Commit",
                            "selections": [
                              {
                                "kind": "LinkedField",
                                "alias": null,
                                "name": "author",
                                "storageKey": null,
                                "args": null,
                                "concreteType": "GitActor",
                                "plural": false,
                                "selections": [
                                  v6,
                                  v16,
                                  v12
                                ]
                              },
                              {
                                "kind": "LinkedField",
                                "alias": null,
                                "name": "committer",
                                "storageKey": null,
                                "args": null,
                                "concreteType": "GitActor",
                                "plural": false,
                                "selections": [
                                  v6,
                                  v12,
                                  v16
                                ]
                              },
                              {
                                "kind": "ScalarField",
                                "alias": null,
                                "name": "authoredByCommitter",
                                "args": null,
                                "storageKey": null
                              },
                              {
                                "kind": "ScalarField",
                                "alias": "sha",
                                "name": "oid",
                                "args": null,
                                "storageKey": null
                              },
                              {
                                "kind": "ScalarField",
                                "alias": null,
                                "name": "message",
                                "args": null,
                                "storageKey": null
                              },
                              {
                                "kind": "ScalarField",
                                "alias": null,
                                "name": "messageHeadlineHTML",
                                "args": null,
                                "storageKey": null
                              },
                              {
                                "kind": "ScalarField",
                                "alias": null,
                                "name": "commitUrl",
                                "args": null,
                                "storageKey": null
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              },
              {
                "kind": "LinkedHandle",
                "alias": null,
                "name": "timeline",
                "args": v15,
                "handle": "connection",
                "key": "IssueTimelineController_timeline",
                "filters": null
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
                    "selections": [
                      {
                        "kind": "ScalarField",
                        "alias": null,
                        "name": "totalCount",
                        "args": null,
                        "storageKey": null
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
(node/*: any*/).hash = '82666b2748036545eb131b3e34f48e72';
module.exports = node;
