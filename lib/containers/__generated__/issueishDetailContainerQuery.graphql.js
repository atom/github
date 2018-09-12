/**
 * @flow
 * @relayHash b91f79735e300a700e5e09747333226d
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteRequest } from 'relay-runtime';
type issueishDetailController_repository$ref = any;
export type issueishDetailContainerQueryVariables = {|
  repoOwner: string,
  repoName: string,
  issueishNumber: number,
  timelineCount: number,
  timelineCursor?: ?string,
|};
export type issueishDetailContainerQueryResponse = {|
  +repository: ?{|
    +$fragmentRefs: issueishDetailController_repository$ref
  |}
|};
export type issueishDetailContainerQuery = {|
  variables: issueishDetailContainerQueryVariables,
  response: issueishDetailContainerQueryResponse,
|};
*/


/*
query issueishDetailContainerQuery(
  $repoOwner: String!
  $repoName: String!
  $issueishNumber: Int!
  $timelineCount: Int!
  $timelineCursor: String
) {
  repository(owner: $repoOwner, name: $repoName) {
    ...issueishDetailController_repository_n0A9R
    id
  }
}

fragment issueishDetailController_repository_n0A9R on Repository {
  ...issueishDetailView_repository
  name
  owner {
    __typename
    login
    id
  }
  issueish: issueOrPullRequest(number: $issueishNumber) {
    __typename
    ... on Issue {
      title
      number
      ...issueishDetailView_issueish_3D8CP9
    }
    ... on PullRequest {
      title
      number
      headRefName
      headRepository {
        name
        owner {
          __typename
          login
          id
        }
        url
        sshUrl
        id
      }
      ...issueishDetailView_issueish_3D8CP9
    }
    ... on Node {
      id
    }
  }
}

fragment issueishDetailView_repository on Repository {
  id
  name
  owner {
    __typename
    login
    id
  }
}

fragment issueishDetailView_issueish_3D8CP9 on IssueOrPullRequest {
  __typename
  ... on Node {
    id
  }
  ... on Issue {
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
  }
  ... on PullRequest {
    isCrossRepository
    changedFiles
    ...prCommitsView_pullRequest
    countedCommits: commits {
      totalCount
    }
    ...prStatusesView_pullRequest
    state
    number
    title
    bodyHTML
    baseRefName
    headRefName
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
    ...prTimelineController_pullRequest_3D8CP9
  }
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

fragment prCommitsView_pullRequest on PullRequest {
  commits(last: 100) {
    edges {
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
      }
    }
  }
}

fragment prStatusesView_pullRequest on PullRequest {
  id
  recentCommits: commits(last: 1) {
    edges {
      node {
        commit {
          status {
            state
            contexts {
              id
              state
              ...prStatusContextView_context
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

fragment prTimelineController_pullRequest_3D8CP9 on PullRequest {
  url
  ...headRefForcePushedEventView_issueish
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
        ...mergedEventView_item
        ...headRefForcePushedEventView_item
        ...commitCommentThreadView_item
        ...crossReferencedEventsView_nodes
        ... on Node {
          id
        }
      }
    }
  }
}

fragment headRefForcePushedEventView_issueish on PullRequest {
  headRefName
  headRepositoryOwner {
    __typename
    login
    id
  }
  repository {
    owner {
      __typename
      login
      id
    }
    id
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
  ...commitView_item
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

fragment mergedEventView_item on MergedEvent {
  actor {
    __typename
    avatarUrl
    login
    ... on Node {
      id
    }
  }
  commit {
    oid
    id
  }
  mergeRefName
  createdAt
}

fragment headRefForcePushedEventView_item on HeadRefForcePushedEvent {
  actor {
    __typename
    avatarUrl
    login
    ... on Node {
      id
    }
  }
  beforeCommit {
    oid
    id
  }
  afterCommit {
    oid
    id
  }
  createdAt
}

fragment commitCommentThreadView_item on CommitCommentThread {
  commit {
    oid
    id
  }
  comments(first: 100) {
    edges {
      node {
        id
        ...commitCommentView_item
      }
    }
  }
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

fragment commitCommentView_item on CommitComment {
  author {
    __typename
    login
    avatarUrl
    ... on Node {
      id
    }
  }
  commit {
    oid
    id
  }
  bodyHTML
  createdAt
  path
  position
}

fragment commitView_item on Commit {
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
  oid
  message
  messageHeadlineHTML
  commitUrl
}

fragment prStatusContextView_context on StatusContext {
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
  }
],
v1 = [
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
v2 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "id",
  "args": null,
  "storageKey": null
},
v3 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "name",
  "args": null,
  "storageKey": null
},
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
  "name": "login",
  "args": null,
  "storageKey": null
},
v6 = [
  v4,
  v5,
  v2
],
v7 = {
  "kind": "LinkedField",
  "alias": null,
  "name": "owner",
  "storageKey": null,
  "args": null,
  "concreteType": null,
  "plural": false,
  "selections": v6
},
v8 = [
  {
    "kind": "ScalarField",
    "alias": null,
    "name": "totalCount",
    "args": null,
    "storageKey": null
  }
],
v9 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "title",
  "args": null,
  "storageKey": null
},
v10 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "url",
  "args": null,
  "storageKey": null
},
v11 = [
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
v12 = {
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
v13 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "cursor",
  "args": null,
  "storageKey": null
},
v14 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "isCrossRepository",
  "args": null,
  "storageKey": null
},
v15 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "avatarUrl",
  "args": null,
  "storageKey": null
},
v16 = [
  v4,
  v5,
  v15,
  v2
],
v17 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "number",
  "args": null,
  "storageKey": null
},
v18 = {
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
    v14,
    {
      "kind": "LinkedField",
      "alias": null,
      "name": "actor",
      "storageKey": null,
      "args": null,
      "concreteType": null,
      "plural": false,
      "selections": v16
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
            v3,
            v7,
            v2,
            {
              "kind": "ScalarField",
              "alias": null,
              "name": "isPrivate",
              "args": null,
              "storageKey": null
            }
          ]
        },
        v2,
        {
          "kind": "InlineFragment",
          "type": "PullRequest",
          "selections": [
            v17,
            v9,
            v10,
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
            v17,
            v9,
            v10,
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
v19 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "oid",
  "args": null,
  "storageKey": null
},
v20 = [
  v19,
  v2
],
v21 = {
  "kind": "LinkedField",
  "alias": null,
  "name": "commit",
  "storageKey": null,
  "args": null,
  "concreteType": "Commit",
  "plural": false,
  "selections": v20
},
v22 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "bodyHTML",
  "args": null,
  "storageKey": null
},
v23 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "createdAt",
  "args": null,
  "storageKey": null
},
v24 = [
  v4,
  v15,
  v5,
  v2
],
v25 = {
  "kind": "LinkedField",
  "alias": null,
  "name": "actor",
  "storageKey": null,
  "args": null,
  "concreteType": null,
  "plural": false,
  "selections": v24
},
v26 = {
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
      "selections": v24
    },
    v22,
    v23,
    v10
  ]
},
v27 = {
  "kind": "LinkedField",
  "alias": null,
  "name": "user",
  "storageKey": null,
  "args": null,
  "concreteType": "User",
  "plural": false,
  "selections": [
    v5,
    v2
  ]
},
v28 = {
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
        v3,
        v27,
        v15
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
        v3,
        v15,
        v27
      ]
    },
    {
      "kind": "ScalarField",
      "alias": null,
      "name": "authoredByCommitter",
      "args": null,
      "storageKey": null
    },
    v19,
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
},
v29 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "state",
  "args": null,
  "storageKey": null
},
v30 = [
  v10
],
v31 = {
  "kind": "LinkedField",
  "alias": null,
  "name": "author",
  "storageKey": null,
  "args": null,
  "concreteType": null,
  "plural": false,
  "selections": [
    v4,
    v5,
    v15,
    v2,
    {
      "kind": "InlineFragment",
      "type": "Bot",
      "selections": v30
    },
    {
      "kind": "InlineFragment",
      "type": "User",
      "selections": v30
    }
  ]
},
v32 = {
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
      "selections": v8
    }
  ]
};
return {
  "kind": "Request",
  "operationKind": "query",
  "name": "issueishDetailContainerQuery",
  "id": null,
  "text": "query issueishDetailContainerQuery(\n  $repoOwner: String!\n  $repoName: String!\n  $issueishNumber: Int!\n  $timelineCount: Int!\n  $timelineCursor: String\n) {\n  repository(owner: $repoOwner, name: $repoName) {\n    ...issueishDetailController_repository_n0A9R\n    id\n  }\n}\n\nfragment issueishDetailController_repository_n0A9R on Repository {\n  ...issueishDetailView_repository\n  name\n  owner {\n    __typename\n    login\n    id\n  }\n  issueish: issueOrPullRequest(number: $issueishNumber) {\n    __typename\n    ... on Issue {\n      title\n      number\n      ...issueishDetailView_issueish_3D8CP9\n    }\n    ... on PullRequest {\n      title\n      number\n      headRefName\n      headRepository {\n        name\n        owner {\n          __typename\n          login\n          id\n        }\n        url\n        sshUrl\n        id\n      }\n      ...issueishDetailView_issueish_3D8CP9\n    }\n    ... on Node {\n      id\n    }\n  }\n}\n\nfragment issueishDetailView_repository on Repository {\n  id\n  name\n  owner {\n    __typename\n    login\n    id\n  }\n}\n\nfragment issueishDetailView_issueish_3D8CP9 on IssueOrPullRequest {\n  __typename\n  ... on Node {\n    id\n  }\n  ... on Issue {\n    state\n    number\n    title\n    bodyHTML\n    author {\n      __typename\n      login\n      avatarUrl\n      ... on User {\n        url\n      }\n      ... on Bot {\n        url\n      }\n      ... on Node {\n        id\n      }\n    }\n    ...issueTimelineController_issue_3D8CP9\n  }\n  ... on PullRequest {\n    isCrossRepository\n    changedFiles\n    ...prCommitsView_pullRequest\n    countedCommits: commits {\n      totalCount\n    }\n    ...prStatusesView_pullRequest\n    state\n    number\n    title\n    bodyHTML\n    baseRefName\n    headRefName\n    author {\n      __typename\n      login\n      avatarUrl\n      ... on User {\n        url\n      }\n      ... on Bot {\n        url\n      }\n      ... on Node {\n        id\n      }\n    }\n    ...prTimelineController_pullRequest_3D8CP9\n  }\n  ... on UniformResourceLocatable {\n    url\n  }\n  ... on Reactable {\n    reactionGroups {\n      content\n      users {\n        totalCount\n      }\n    }\n  }\n}\n\nfragment issueTimelineController_issue_3D8CP9 on Issue {\n  url\n  timeline(first: $timelineCount, after: $timelineCursor) {\n    pageInfo {\n      endCursor\n      hasNextPage\n    }\n    edges {\n      cursor\n      node {\n        __typename\n        ...commitsView_nodes\n        ...issueCommentView_item\n        ...crossReferencedEventsView_nodes\n        ... on Node {\n          id\n        }\n      }\n    }\n  }\n}\n\nfragment prCommitsView_pullRequest on PullRequest {\n  commits(last: 100) {\n    edges {\n      node {\n        commit {\n          committer {\n            avatarUrl\n            name\n            date\n          }\n          messageHeadline\n          messageBody\n          abbreviatedOid\n          url\n          id\n        }\n        id\n      }\n    }\n  }\n}\n\nfragment prStatusesView_pullRequest on PullRequest {\n  id\n  recentCommits: commits(last: 1) {\n    edges {\n      node {\n        commit {\n          status {\n            state\n            contexts {\n              id\n              state\n              ...prStatusContextView_context\n            }\n            id\n          }\n          id\n        }\n        id\n      }\n    }\n  }\n}\n\nfragment prTimelineController_pullRequest_3D8CP9 on PullRequest {\n  url\n  ...headRefForcePushedEventView_issueish\n  timeline(first: $timelineCount, after: $timelineCursor) {\n    pageInfo {\n      endCursor\n      hasNextPage\n    }\n    edges {\n      cursor\n      node {\n        __typename\n        ...commitsView_nodes\n        ...issueCommentView_item\n        ...mergedEventView_item\n        ...headRefForcePushedEventView_item\n        ...commitCommentThreadView_item\n        ...crossReferencedEventsView_nodes\n        ... on Node {\n          id\n        }\n      }\n    }\n  }\n}\n\nfragment headRefForcePushedEventView_issueish on PullRequest {\n  headRefName\n  headRepositoryOwner {\n    __typename\n    login\n    id\n  }\n  repository {\n    owner {\n      __typename\n      login\n      id\n    }\n    id\n  }\n}\n\nfragment commitsView_nodes on Commit {\n  id\n  author {\n    name\n    user {\n      login\n      id\n    }\n  }\n  ...commitView_item\n}\n\nfragment issueCommentView_item on IssueComment {\n  author {\n    __typename\n    avatarUrl\n    login\n    ... on Node {\n      id\n    }\n  }\n  bodyHTML\n  createdAt\n  url\n}\n\nfragment mergedEventView_item on MergedEvent {\n  actor {\n    __typename\n    avatarUrl\n    login\n    ... on Node {\n      id\n    }\n  }\n  commit {\n    oid\n    id\n  }\n  mergeRefName\n  createdAt\n}\n\nfragment headRefForcePushedEventView_item on HeadRefForcePushedEvent {\n  actor {\n    __typename\n    avatarUrl\n    login\n    ... on Node {\n      id\n    }\n  }\n  beforeCommit {\n    oid\n    id\n  }\n  afterCommit {\n    oid\n    id\n  }\n  createdAt\n}\n\nfragment commitCommentThreadView_item on CommitCommentThread {\n  commit {\n    oid\n    id\n  }\n  comments(first: 100) {\n    edges {\n      node {\n        id\n        ...commitCommentView_item\n      }\n    }\n  }\n}\n\nfragment crossReferencedEventsView_nodes on CrossReferencedEvent {\n  id\n  referencedAt\n  isCrossRepository\n  actor {\n    __typename\n    login\n    avatarUrl\n    ... on Node {\n      id\n    }\n  }\n  source {\n    __typename\n    ... on RepositoryNode {\n      repository {\n        name\n        owner {\n          __typename\n          login\n          id\n        }\n        id\n      }\n    }\n    ... on Node {\n      id\n    }\n  }\n  ...crossReferencedEventView_item\n}\n\nfragment crossReferencedEventView_item on CrossReferencedEvent {\n  id\n  isCrossRepository\n  source {\n    __typename\n    ... on Issue {\n      number\n      title\n      url\n      issueState: state\n    }\n    ... on PullRequest {\n      number\n      title\n      url\n      prState: state\n    }\n    ... on RepositoryNode {\n      repository {\n        name\n        isPrivate\n        owner {\n          __typename\n          login\n          id\n        }\n        id\n      }\n    }\n    ... on Node {\n      id\n    }\n  }\n}\n\nfragment commitCommentView_item on CommitComment {\n  author {\n    __typename\n    login\n    avatarUrl\n    ... on Node {\n      id\n    }\n  }\n  commit {\n    oid\n    id\n  }\n  bodyHTML\n  createdAt\n  path\n  position\n}\n\nfragment commitView_item on Commit {\n  author {\n    name\n    avatarUrl\n    user {\n      login\n      id\n    }\n  }\n  committer {\n    name\n    avatarUrl\n    user {\n      login\n      id\n    }\n  }\n  authoredByCommitter\n  oid\n  message\n  messageHeadlineHTML\n  commitUrl\n}\n\nfragment prStatusContextView_context on StatusContext {\n  context\n  description\n  state\n  targetUrl\n}\n",
  "metadata": {},
  "fragment": {
    "kind": "Fragment",
    "name": "issueishDetailContainerQuery",
    "type": "Query",
    "metadata": null,
    "argumentDefinitions": v0,
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "name": "repository",
        "storageKey": null,
        "args": v1,
        "concreteType": "Repository",
        "plural": false,
        "selections": [
          {
            "kind": "FragmentSpread",
            "name": "issueishDetailController_repository",
            "args": [
              {
                "kind": "Variable",
                "name": "issueishNumber",
                "variableName": "issueishNumber",
                "type": null
              },
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
            ]
          }
        ]
      }
    ]
  },
  "operation": {
    "kind": "Operation",
    "name": "issueishDetailContainerQuery",
    "argumentDefinitions": v0,
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "name": "repository",
        "storageKey": null,
        "args": v1,
        "concreteType": "Repository",
        "plural": false,
        "selections": [
          v2,
          v3,
          v7,
          {
            "kind": "LinkedField",
            "alias": "issueish",
            "name": "issueOrPullRequest",
            "storageKey": null,
            "args": [
              {
                "kind": "Variable",
                "name": "number",
                "variableName": "issueishNumber",
                "type": "Int!"
              }
            ],
            "concreteType": null,
            "plural": false,
            "selections": [
              v4,
              v2,
              {
                "kind": "InlineFragment",
                "type": "PullRequest",
                "selections": [
                  {
                    "kind": "LinkedField",
                    "alias": "countedCommits",
                    "name": "commits",
                    "storageKey": null,
                    "args": null,
                    "concreteType": "PullRequestCommitConnection",
                    "plural": false,
                    "selections": v8
                  },
                  v9,
                  {
                    "kind": "ScalarField",
                    "alias": null,
                    "name": "headRefName",
                    "args": null,
                    "storageKey": null
                  },
                  {
                    "kind": "LinkedField",
                    "alias": null,
                    "name": "headRepository",
                    "storageKey": null,
                    "args": null,
                    "concreteType": "Repository",
                    "plural": false,
                    "selections": [
                      v3,
                      v7,
                      v10,
                      {
                        "kind": "ScalarField",
                        "alias": null,
                        "name": "sshUrl",
                        "args": null,
                        "storageKey": null
                      },
                      v2
                    ]
                  },
                  {
                    "kind": "LinkedField",
                    "alias": null,
                    "name": "timeline",
                    "storageKey": null,
                    "args": v11,
                    "concreteType": "PullRequestTimelineConnection",
                    "plural": false,
                    "selections": [
                      v12,
                      {
                        "kind": "LinkedField",
                        "alias": null,
                        "name": "edges",
                        "storageKey": null,
                        "args": null,
                        "concreteType": "PullRequestTimelineItemEdge",
                        "plural": true,
                        "selections": [
                          v13,
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
                              v2,
                              v18,
                              {
                                "kind": "InlineFragment",
                                "type": "CommitCommentThread",
                                "selections": [
                                  v21,
                                  {
                                    "kind": "LinkedField",
                                    "alias": null,
                                    "name": "comments",
                                    "storageKey": "comments(first:100)",
                                    "args": [
                                      {
                                        "kind": "Literal",
                                        "name": "first",
                                        "value": 100,
                                        "type": "Int"
                                      }
                                    ],
                                    "concreteType": "CommitCommentConnection",
                                    "plural": false,
                                    "selections": [
                                      {
                                        "kind": "LinkedField",
                                        "alias": null,
                                        "name": "edges",
                                        "storageKey": null,
                                        "args": null,
                                        "concreteType": "CommitCommentEdge",
                                        "plural": true,
                                        "selections": [
                                          {
                                            "kind": "LinkedField",
                                            "alias": null,
                                            "name": "node",
                                            "storageKey": null,
                                            "args": null,
                                            "concreteType": "CommitComment",
                                            "plural": false,
                                            "selections": [
                                              v2,
                                              {
                                                "kind": "LinkedField",
                                                "alias": null,
                                                "name": "author",
                                                "storageKey": null,
                                                "args": null,
                                                "concreteType": null,
                                                "plural": false,
                                                "selections": v16
                                              },
                                              v21,
                                              v22,
                                              v23,
                                              {
                                                "kind": "ScalarField",
                                                "alias": null,
                                                "name": "path",
                                                "args": null,
                                                "storageKey": null
                                              },
                                              {
                                                "kind": "ScalarField",
                                                "alias": null,
                                                "name": "position",
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
                                "kind": "InlineFragment",
                                "type": "HeadRefForcePushedEvent",
                                "selections": [
                                  v25,
                                  {
                                    "kind": "LinkedField",
                                    "alias": null,
                                    "name": "beforeCommit",
                                    "storageKey": null,
                                    "args": null,
                                    "concreteType": "Commit",
                                    "plural": false,
                                    "selections": v20
                                  },
                                  {
                                    "kind": "LinkedField",
                                    "alias": null,
                                    "name": "afterCommit",
                                    "storageKey": null,
                                    "args": null,
                                    "concreteType": "Commit",
                                    "plural": false,
                                    "selections": v20
                                  },
                                  v23
                                ]
                              },
                              {
                                "kind": "InlineFragment",
                                "type": "MergedEvent",
                                "selections": [
                                  v25,
                                  v21,
                                  {
                                    "kind": "ScalarField",
                                    "alias": null,
                                    "name": "mergeRefName",
                                    "args": null,
                                    "storageKey": null
                                  },
                                  v23
                                ]
                              },
                              v26,
                              v28
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
                    "args": v11,
                    "handle": "connection",
                    "key": "prTimelineContainer_timeline",
                    "filters": null
                  },
                  v14,
                  {
                    "kind": "ScalarField",
                    "alias": null,
                    "name": "changedFiles",
                    "args": null,
                    "storageKey": null
                  },
                  {
                    "kind": "LinkedField",
                    "alias": null,
                    "name": "commits",
                    "storageKey": "commits(last:100)",
                    "args": [
                      {
                        "kind": "Literal",
                        "name": "last",
                        "value": 100,
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
                                    "name": "committer",
                                    "storageKey": null,
                                    "args": null,
                                    "concreteType": "GitActor",
                                    "plural": false,
                                    "selections": [
                                      v15,
                                      v3,
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
                                  v10,
                                  v2
                                ]
                              },
                              v2
                            ]
                          }
                        ]
                      }
                    ]
                  },
                  v17,
                  {
                    "kind": "LinkedField",
                    "alias": "recentCommits",
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
                                      v29,
                                      {
                                        "kind": "LinkedField",
                                        "alias": null,
                                        "name": "contexts",
                                        "storageKey": null,
                                        "args": null,
                                        "concreteType": "StatusContext",
                                        "plural": true,
                                        "selections": [
                                          v2,
                                          v29,
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
                                      v2
                                    ]
                                  },
                                  v2
                                ]
                              },
                              v2
                            ]
                          }
                        ]
                      }
                    ]
                  },
                  v29,
                  v22,
                  {
                    "kind": "ScalarField",
                    "alias": null,
                    "name": "baseRefName",
                    "args": null,
                    "storageKey": null
                  },
                  v31,
                  v10,
                  {
                    "kind": "LinkedField",
                    "alias": null,
                    "name": "headRepositoryOwner",
                    "storageKey": null,
                    "args": null,
                    "concreteType": null,
                    "plural": false,
                    "selections": v6
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
                      v7,
                      v2
                    ]
                  },
                  v32
                ]
              },
              {
                "kind": "InlineFragment",
                "type": "Issue",
                "selections": [
                  v22,
                  v9,
                  v29,
                  v17,
                  v31,
                  v10,
                  {
                    "kind": "LinkedField",
                    "alias": null,
                    "name": "timeline",
                    "storageKey": null,
                    "args": v11,
                    "concreteType": "IssueTimelineConnection",
                    "plural": false,
                    "selections": [
                      v12,
                      {
                        "kind": "LinkedField",
                        "alias": null,
                        "name": "edges",
                        "storageKey": null,
                        "args": null,
                        "concreteType": "IssueTimelineItemEdge",
                        "plural": true,
                        "selections": [
                          v13,
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
                              v2,
                              v18,
                              v26,
                              v28
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
                    "args": v11,
                    "handle": "connection",
                    "key": "IssueTimelineController_timeline",
                    "filters": null
                  },
                  v32
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
(node/*: any*/).hash = '5559fe0b5c062ee9f888aefc5f0dfd15';
module.exports = node;
