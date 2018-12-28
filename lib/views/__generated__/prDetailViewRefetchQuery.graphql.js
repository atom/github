/**
 * @flow
 * @relayHash e23a0a2054c2cff16dfe71a64cf4fe9f
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteRequest } from 'relay-runtime';
type prDetailView_pullRequest$ref = any;
type prDetailView_repository$ref = any;
export type prDetailViewRefetchQueryVariables = {|
  repoId: string,
  issueishId: string,
  timelineCount: number,
  timelineCursor?: ?string,
  commitCount: number,
  commitCursor?: ?string,
  commentCount: number,
  commentCursor?: ?string,
  reviewCount?: ?number,
  reviewCursor?: ?string,
|};
export type prDetailViewRefetchQueryResponse = {|
  +repository: ?{|
    +$fragmentRefs: prDetailView_repository$ref
  |},
  +pullRequest: ?{|
    +$fragmentRefs: prDetailView_pullRequest$ref
  |},
|};
export type prDetailViewRefetchQuery = {|
  variables: prDetailViewRefetchQueryVariables,
  response: prDetailViewRefetchQueryResponse,
|};
*/


/*
query prDetailViewRefetchQuery(
  $repoId: ID!
  $issueishId: ID!
  $timelineCount: Int!
  $timelineCursor: String
  $commitCount: Int!
  $commitCursor: String
  $commentCount: Int!
  $commentCursor: String
  $reviewCount: Int
  $reviewCursor: String
) {
  repository: node(id: $repoId) {
    __typename
    ...prDetailView_repository_3D8CP9
    id
  }
  pullRequest: node(id: $issueishId) {
    __typename
    ...prDetailView_pullRequest_2qM2KL
    id
  }
}

fragment prDetailView_repository_3D8CP9 on Repository {
  id
  name
  owner {
    __typename
    login
    id
  }
}

fragment prDetailView_pullRequest_2qM2KL on PullRequest {
  __typename
  ... on Node {
    id
  }
  isCrossRepository
  changedFiles
  ...prReviewsContainer_pullRequest_2zzc96
  ...prCommitsView_pullRequest_38TpXw
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

fragment prReviewsContainer_pullRequest_2zzc96 on PullRequest {
  url
  reviews(first: $reviewCount, after: $reviewCursor) {
    pageInfo {
      hasNextPage
      endCursor
    }
    edges {
      cursor
      node {
        id
        body
        commitId: commit {
          oid
          id
        }
        state
        submittedAt
        login: author {
          __typename
          login
          ... on Node {
            id
          }
        }
        author {
          __typename
          avatarUrl
          ... on Node {
            id
          }
        }
        ...prReviewCommentsContainer_review_1VbUmL
        __typename
      }
    }
  }
}

fragment prCommitsView_pullRequest_38TpXw on PullRequest {
  url
  commits(first: $commitCount, after: $commitCursor) {
    pageInfo {
      endCursor
      hasNextPage
    }
    edges {
      cursor
      node {
        commit {
          id
          ...prCommitView_item
        }
        id
        __typename
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

fragment prStatusContextView_context on StatusContext {
  context
  description
  state
  targetUrl
}

fragment prCommitView_item on Commit {
  committer {
    avatarUrl
    name
    date
  }
  messageHeadline
  messageBody
  shortSha: abbreviatedOid
  sha: oid
  url
}

fragment prReviewCommentsContainer_review_1VbUmL on PullRequestReview {
  id
  comments(first: $commentCount, after: $commentCursor) {
    pageInfo {
      hasNextPage
      endCursor
    }
    edges {
      cursor
      node {
        id
        author {
          __typename
          avatarUrl
          login
          ... on Node {
            id
          }
        }
        body
        bodyHTML
        path
        position
        replyTo {
          id
        }
        createdAt
        url
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
    "kind": "LocalArgument",
    "name": "commentCount",
    "type": "Int!",
    "defaultValue": null
  },
  {
    "kind": "LocalArgument",
    "name": "commentCursor",
    "type": "String",
    "defaultValue": null
  },
  {
    "kind": "LocalArgument",
    "name": "reviewCount",
    "type": "Int",
    "defaultValue": null
  },
  {
    "kind": "LocalArgument",
    "name": "reviewCursor",
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
v2 = {
  "kind": "Variable",
  "name": "timelineCount",
  "variableName": "timelineCount",
  "type": null
},
v3 = {
  "kind": "Variable",
  "name": "timelineCursor",
  "variableName": "timelineCursor",
  "type": null
},
v4 = [
  {
    "kind": "Variable",
    "name": "id",
    "variableName": "issueishId",
    "type": "ID!"
  }
],
v5 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "__typename",
  "args": null,
  "storageKey": null
},
v6 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "id",
  "args": null,
  "storageKey": null
},
v7 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "name",
  "args": null,
  "storageKey": null
},
v8 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "login",
  "args": null,
  "storageKey": null
},
v9 = [
  v5,
  v8,
  v6
],
v10 = {
  "kind": "LinkedField",
  "alias": null,
  "name": "owner",
  "storageKey": null,
  "args": null,
  "concreteType": null,
  "plural": false,
  "selections": v9
},
v11 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "number",
  "args": null,
  "storageKey": null
},
v12 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "isCrossRepository",
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
  {
    "kind": "Variable",
    "name": "after",
    "variableName": "reviewCursor",
    "type": "String"
  },
  {
    "kind": "Variable",
    "name": "first",
    "variableName": "reviewCount",
    "type": "Int"
  }
],
v15 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "hasNextPage",
  "args": null,
  "storageKey": null
},
v16 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "endCursor",
  "args": null,
  "storageKey": null
},
v17 = {
  "kind": "LinkedField",
  "alias": null,
  "name": "pageInfo",
  "storageKey": null,
  "args": null,
  "concreteType": "PageInfo",
  "plural": false,
  "selections": [
    v15,
    v16
  ]
},
v18 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "cursor",
  "args": null,
  "storageKey": null
},
v19 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "body",
  "args": null,
  "storageKey": null
},
v20 = [
  {
    "kind": "ScalarField",
    "alias": null,
    "name": "oid",
    "args": null,
    "storageKey": null
  },
  v6
],
v21 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "state",
  "args": null,
  "storageKey": null
},
v22 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "avatarUrl",
  "args": null,
  "storageKey": null
},
v23 = [
  {
    "kind": "Variable",
    "name": "after",
    "variableName": "commentCursor",
    "type": "String"
  },
  {
    "kind": "Variable",
    "name": "first",
    "variableName": "commentCount",
    "type": "Int"
  }
],
v24 = [
  v5,
  v22,
  v8,
  v6
],
v25 = {
  "kind": "LinkedField",
  "alias": null,
  "name": "author",
  "storageKey": null,
  "args": null,
  "concreteType": null,
  "plural": false,
  "selections": v24
},
v26 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "bodyHTML",
  "args": null,
  "storageKey": null
},
v27 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "path",
  "args": null,
  "storageKey": null
},
v28 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "position",
  "args": null,
  "storageKey": null
},
v29 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "createdAt",
  "args": null,
  "storageKey": null
},
v30 = [
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
],
v31 = {
  "kind": "LinkedField",
  "alias": null,
  "name": "pageInfo",
  "storageKey": null,
  "args": null,
  "concreteType": "PageInfo",
  "plural": false,
  "selections": [
    v16,
    v15
  ]
},
v32 = {
  "kind": "ScalarField",
  "alias": "sha",
  "name": "oid",
  "args": null,
  "storageKey": null
},
v33 = [
  {
    "kind": "ScalarField",
    "alias": null,
    "name": "totalCount",
    "args": null,
    "storageKey": null
  }
],
v34 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "title",
  "args": null,
  "storageKey": null
},
v35 = [
  v13
],
v36 = [
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
v37 = [
  v5,
  v8,
  v22,
  v6
],
v38 = {
  "kind": "LinkedField",
  "alias": null,
  "name": "commit",
  "storageKey": null,
  "args": null,
  "concreteType": "Commit",
  "plural": false,
  "selections": v20
},
v39 = {
  "kind": "LinkedField",
  "alias": null,
  "name": "actor",
  "storageKey": null,
  "args": null,
  "concreteType": null,
  "plural": false,
  "selections": v24
},
v40 = {
  "kind": "LinkedField",
  "alias": null,
  "name": "user",
  "storageKey": null,
  "args": null,
  "concreteType": "User",
  "plural": false,
  "selections": [
    v8,
    v6
  ]
};
return {
  "kind": "Request",
  "operationKind": "query",
  "name": "prDetailViewRefetchQuery",
  "id": null,
  "text": "query prDetailViewRefetchQuery(\n  $repoId: ID!\n  $issueishId: ID!\n  $timelineCount: Int!\n  $timelineCursor: String\n  $commitCount: Int!\n  $commitCursor: String\n  $commentCount: Int!\n  $commentCursor: String\n  $reviewCount: Int\n  $reviewCursor: String\n) {\n  repository: node(id: $repoId) {\n    __typename\n    ...prDetailView_repository_3D8CP9\n    id\n  }\n  pullRequest: node(id: $issueishId) {\n    __typename\n    ...prDetailView_pullRequest_2qM2KL\n    id\n  }\n}\n\nfragment prDetailView_repository_3D8CP9 on Repository {\n  id\n  name\n  owner {\n    __typename\n    login\n    id\n  }\n}\n\nfragment prDetailView_pullRequest_2qM2KL on PullRequest {\n  __typename\n  ... on Node {\n    id\n  }\n  isCrossRepository\n  changedFiles\n  ...prReviewsContainer_pullRequest_2zzc96\n  ...prCommitsView_pullRequest_38TpXw\n  countedCommits: commits {\n    totalCount\n  }\n  ...prStatusesView_pullRequest\n  state\n  number\n  title\n  bodyHTML\n  baseRefName\n  headRefName\n  author {\n    __typename\n    login\n    avatarUrl\n    ... on User {\n      url\n    }\n    ... on Bot {\n      url\n    }\n    ... on Node {\n      id\n    }\n  }\n  ...prTimelineController_pullRequest_3D8CP9\n  ... on UniformResourceLocatable {\n    url\n  }\n  ... on Reactable {\n    reactionGroups {\n      content\n      users {\n        totalCount\n      }\n    }\n  }\n}\n\nfragment prReviewsContainer_pullRequest_2zzc96 on PullRequest {\n  url\n  reviews(first: $reviewCount, after: $reviewCursor) {\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    edges {\n      cursor\n      node {\n        id\n        body\n        commitId: commit {\n          oid\n          id\n        }\n        state\n        submittedAt\n        login: author {\n          __typename\n          login\n          ... on Node {\n            id\n          }\n        }\n        author {\n          __typename\n          avatarUrl\n          ... on Node {\n            id\n          }\n        }\n        ...prReviewCommentsContainer_review_1VbUmL\n        __typename\n      }\n    }\n  }\n}\n\nfragment prCommitsView_pullRequest_38TpXw on PullRequest {\n  url\n  commits(first: $commitCount, after: $commitCursor) {\n    pageInfo {\n      endCursor\n      hasNextPage\n    }\n    edges {\n      cursor\n      node {\n        commit {\n          id\n          ...prCommitView_item\n        }\n        id\n        __typename\n      }\n    }\n  }\n}\n\nfragment prStatusesView_pullRequest on PullRequest {\n  id\n  recentCommits: commits(last: 1) {\n    edges {\n      node {\n        commit {\n          status {\n            state\n            contexts {\n              id\n              state\n              ...prStatusContextView_context\n            }\n            id\n          }\n          id\n        }\n        id\n      }\n    }\n  }\n}\n\nfragment prTimelineController_pullRequest_3D8CP9 on PullRequest {\n  url\n  ...headRefForcePushedEventView_issueish\n  timeline(first: $timelineCount, after: $timelineCursor) {\n    pageInfo {\n      endCursor\n      hasNextPage\n    }\n    edges {\n      cursor\n      node {\n        __typename\n        ...commitsView_nodes\n        ...issueCommentView_item\n        ...mergedEventView_item\n        ...headRefForcePushedEventView_item\n        ...commitCommentThreadView_item\n        ...crossReferencedEventsView_nodes\n        ... on Node {\n          id\n        }\n      }\n    }\n  }\n}\n\nfragment headRefForcePushedEventView_issueish on PullRequest {\n  headRefName\n  headRepositoryOwner {\n    __typename\n    login\n    id\n  }\n  repository {\n    owner {\n      __typename\n      login\n      id\n    }\n    id\n  }\n}\n\nfragment commitsView_nodes on Commit {\n  id\n  author {\n    name\n    user {\n      login\n      id\n    }\n  }\n  ...commitView_commit\n}\n\nfragment issueCommentView_item on IssueComment {\n  author {\n    __typename\n    avatarUrl\n    login\n    ... on Node {\n      id\n    }\n  }\n  bodyHTML\n  createdAt\n  url\n}\n\nfragment mergedEventView_item on MergedEvent {\n  actor {\n    __typename\n    avatarUrl\n    login\n    ... on Node {\n      id\n    }\n  }\n  commit {\n    oid\n    id\n  }\n  mergeRefName\n  createdAt\n}\n\nfragment headRefForcePushedEventView_item on HeadRefForcePushedEvent {\n  actor {\n    __typename\n    avatarUrl\n    login\n    ... on Node {\n      id\n    }\n  }\n  beforeCommit {\n    oid\n    id\n  }\n  afterCommit {\n    oid\n    id\n  }\n  createdAt\n}\n\nfragment commitCommentThreadView_item on CommitCommentThread {\n  commit {\n    oid\n    id\n  }\n  comments(first: 100) {\n    edges {\n      node {\n        id\n        ...commitCommentView_item\n      }\n    }\n  }\n}\n\nfragment crossReferencedEventsView_nodes on CrossReferencedEvent {\n  id\n  referencedAt\n  isCrossRepository\n  actor {\n    __typename\n    login\n    avatarUrl\n    ... on Node {\n      id\n    }\n  }\n  source {\n    __typename\n    ... on RepositoryNode {\n      repository {\n        name\n        owner {\n          __typename\n          login\n          id\n        }\n        id\n      }\n    }\n    ... on Node {\n      id\n    }\n  }\n  ...crossReferencedEventView_item\n}\n\nfragment crossReferencedEventView_item on CrossReferencedEvent {\n  id\n  isCrossRepository\n  source {\n    __typename\n    ... on Issue {\n      number\n      title\n      url\n      issueState: state\n    }\n    ... on PullRequest {\n      number\n      title\n      url\n      prState: state\n    }\n    ... on RepositoryNode {\n      repository {\n        name\n        isPrivate\n        owner {\n          __typename\n          login\n          id\n        }\n        id\n      }\n    }\n    ... on Node {\n      id\n    }\n  }\n}\n\nfragment commitCommentView_item on CommitComment {\n  author {\n    __typename\n    login\n    avatarUrl\n    ... on Node {\n      id\n    }\n  }\n  commit {\n    oid\n    id\n  }\n  bodyHTML\n  createdAt\n  path\n  position\n}\n\nfragment commitView_commit on Commit {\n  author {\n    name\n    avatarUrl\n    user {\n      login\n      id\n    }\n  }\n  committer {\n    name\n    avatarUrl\n    user {\n      login\n      id\n    }\n  }\n  authoredByCommitter\n  sha: oid\n  message\n  messageHeadlineHTML\n  commitUrl\n}\n\nfragment prStatusContextView_context on StatusContext {\n  context\n  description\n  state\n  targetUrl\n}\n\nfragment prCommitView_item on Commit {\n  committer {\n    avatarUrl\n    name\n    date\n  }\n  messageHeadline\n  messageBody\n  shortSha: abbreviatedOid\n  sha: oid\n  url\n}\n\nfragment prReviewCommentsContainer_review_1VbUmL on PullRequestReview {\n  id\n  comments(first: $commentCount, after: $commentCursor) {\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    edges {\n      cursor\n      node {\n        id\n        author {\n          __typename\n          avatarUrl\n          login\n          ... on Node {\n            id\n          }\n        }\n        body\n        bodyHTML\n        path\n        position\n        replyTo {\n          id\n        }\n        createdAt\n        url\n        __typename\n      }\n    }\n  }\n}\n",
  "metadata": {},
  "fragment": {
    "kind": "Fragment",
    "name": "prDetailViewRefetchQuery",
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
            "name": "prDetailView_repository",
            "args": [
              v2,
              v3
            ]
          }
        ]
      },
      {
        "kind": "LinkedField",
        "alias": "pullRequest",
        "name": "node",
        "storageKey": null,
        "args": v4,
        "concreteType": null,
        "plural": false,
        "selections": [
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
              v2,
              v3
            ]
          }
        ]
      }
    ]
  },
  "operation": {
    "kind": "Operation",
    "name": "prDetailViewRefetchQuery",
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
          v5,
          v6,
          {
            "kind": "InlineFragment",
            "type": "Repository",
            "selections": [
              v7,
              v10
            ]
          }
        ]
      },
      {
        "kind": "LinkedField",
        "alias": "pullRequest",
        "name": "node",
        "storageKey": null,
        "args": v4,
        "concreteType": null,
        "plural": false,
        "selections": [
          v5,
          v6,
          {
            "kind": "InlineFragment",
            "type": "PullRequest",
            "selections": [
              v11,
              v5,
              v12,
              {
                "kind": "ScalarField",
                "alias": null,
                "name": "changedFiles",
                "args": null,
                "storageKey": null
              },
              v13,
              {
                "kind": "LinkedField",
                "alias": null,
                "name": "reviews",
                "storageKey": null,
                "args": v14,
                "concreteType": "PullRequestReviewConnection",
                "plural": false,
                "selections": [
                  v17,
                  {
                    "kind": "LinkedField",
                    "alias": null,
                    "name": "edges",
                    "storageKey": null,
                    "args": null,
                    "concreteType": "PullRequestReviewEdge",
                    "plural": true,
                    "selections": [
                      v18,
                      {
                        "kind": "LinkedField",
                        "alias": null,
                        "name": "node",
                        "storageKey": null,
                        "args": null,
                        "concreteType": "PullRequestReview",
                        "plural": false,
                        "selections": [
                          v6,
                          v19,
                          {
                            "kind": "LinkedField",
                            "alias": "commitId",
                            "name": "commit",
                            "storageKey": null,
                            "args": null,
                            "concreteType": "Commit",
                            "plural": false,
                            "selections": v20
                          },
                          v21,
                          {
                            "kind": "ScalarField",
                            "alias": null,
                            "name": "submittedAt",
                            "args": null,
                            "storageKey": null
                          },
                          {
                            "kind": "LinkedField",
                            "alias": "login",
                            "name": "author",
                            "storageKey": null,
                            "args": null,
                            "concreteType": null,
                            "plural": false,
                            "selections": v9
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
                              v5,
                              v22,
                              v6
                            ]
                          },
                          {
                            "kind": "LinkedField",
                            "alias": null,
                            "name": "comments",
                            "storageKey": null,
                            "args": v23,
                            "concreteType": "PullRequestReviewCommentConnection",
                            "plural": false,
                            "selections": [
                              v17,
                              {
                                "kind": "LinkedField",
                                "alias": null,
                                "name": "edges",
                                "storageKey": null,
                                "args": null,
                                "concreteType": "PullRequestReviewCommentEdge",
                                "plural": true,
                                "selections": [
                                  v18,
                                  {
                                    "kind": "LinkedField",
                                    "alias": null,
                                    "name": "node",
                                    "storageKey": null,
                                    "args": null,
                                    "concreteType": "PullRequestReviewComment",
                                    "plural": false,
                                    "selections": [
                                      v6,
                                      v25,
                                      v19,
                                      v26,
                                      v27,
                                      v28,
                                      {
                                        "kind": "LinkedField",
                                        "alias": null,
                                        "name": "replyTo",
                                        "storageKey": null,
                                        "args": null,
                                        "concreteType": "PullRequestReviewComment",
                                        "plural": false,
                                        "selections": [
                                          v6
                                        ]
                                      },
                                      v29,
                                      v13,
                                      v5
                                    ]
                                  }
                                ]
                              }
                            ]
                          },
                          {
                            "kind": "LinkedHandle",
                            "alias": null,
                            "name": "comments",
                            "args": v23,
                            "handle": "connection",
                            "key": "PrReviewCommentsContainer_comments",
                            "filters": null
                          },
                          v5
                        ]
                      }
                    ]
                  }
                ]
              },
              {
                "kind": "LinkedHandle",
                "alias": null,
                "name": "reviews",
                "args": v14,
                "handle": "connection",
                "key": "PrReviewsContainer_reviews",
                "filters": null
              },
              {
                "kind": "LinkedField",
                "alias": null,
                "name": "commits",
                "storageKey": null,
                "args": v30,
                "concreteType": "PullRequestCommitConnection",
                "plural": false,
                "selections": [
                  v31,
                  {
                    "kind": "LinkedField",
                    "alias": null,
                    "name": "edges",
                    "storageKey": null,
                    "args": null,
                    "concreteType": "PullRequestCommitEdge",
                    "plural": true,
                    "selections": [
                      v18,
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
                              v6,
                              {
                                "kind": "LinkedField",
                                "alias": null,
                                "name": "committer",
                                "storageKey": null,
                                "args": null,
                                "concreteType": "GitActor",
                                "plural": false,
                                "selections": [
                                  v22,
                                  v7,
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
                                "alias": "shortSha",
                                "name": "abbreviatedOid",
                                "args": null,
                                "storageKey": null
                              },
                              v32,
                              v13
                            ]
                          },
                          v6,
                          v5
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
                "args": v30,
                "handle": "connection",
                "key": "prCommitsView_commits",
                "filters": null
              },
              {
                "kind": "LinkedField",
                "alias": "countedCommits",
                "name": "commits",
                "storageKey": null,
                "args": null,
                "concreteType": "PullRequestCommitConnection",
                "plural": false,
                "selections": v33
              },
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
                                  v21,
                                  {
                                    "kind": "LinkedField",
                                    "alias": null,
                                    "name": "contexts",
                                    "storageKey": null,
                                    "args": null,
                                    "concreteType": "StatusContext",
                                    "plural": true,
                                    "selections": [
                                      v6,
                                      v21,
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
                                  v6
                                ]
                              },
                              v6
                            ]
                          },
                          v6
                        ]
                      }
                    ]
                  }
                ]
              },
              v21,
              v34,
              v26,
              {
                "kind": "ScalarField",
                "alias": null,
                "name": "baseRefName",
                "args": null,
                "storageKey": null
              },
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
                "name": "author",
                "storageKey": null,
                "args": null,
                "concreteType": null,
                "plural": false,
                "selections": [
                  v5,
                  v8,
                  v22,
                  v6,
                  {
                    "kind": "InlineFragment",
                    "type": "Bot",
                    "selections": v35
                  },
                  {
                    "kind": "InlineFragment",
                    "type": "User",
                    "selections": v35
                  }
                ]
              },
              {
                "kind": "LinkedField",
                "alias": null,
                "name": "headRepositoryOwner",
                "storageKey": null,
                "args": null,
                "concreteType": null,
                "plural": false,
                "selections": v9
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
                  v10,
                  v6
                ]
              },
              {
                "kind": "LinkedField",
                "alias": null,
                "name": "timeline",
                "storageKey": null,
                "args": v36,
                "concreteType": "PullRequestTimelineConnection",
                "plural": false,
                "selections": [
                  v31,
                  {
                    "kind": "LinkedField",
                    "alias": null,
                    "name": "edges",
                    "storageKey": null,
                    "args": null,
                    "concreteType": "PullRequestTimelineItemEdge",
                    "plural": true,
                    "selections": [
                      v18,
                      {
                        "kind": "LinkedField",
                        "alias": null,
                        "name": "node",
                        "storageKey": null,
                        "args": null,
                        "concreteType": null,
                        "plural": false,
                        "selections": [
                          v5,
                          v6,
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
                              v12,
                              {
                                "kind": "LinkedField",
                                "alias": null,
                                "name": "actor",
                                "storageKey": null,
                                "args": null,
                                "concreteType": null,
                                "plural": false,
                                "selections": v37
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
                                  v5,
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
                                      v10,
                                      v6,
                                      {
                                        "kind": "ScalarField",
                                        "alias": null,
                                        "name": "isPrivate",
                                        "args": null,
                                        "storageKey": null
                                      }
                                    ]
                                  },
                                  v6,
                                  {
                                    "kind": "InlineFragment",
                                    "type": "PullRequest",
                                    "selections": [
                                      v11,
                                      v34,
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
                                      v11,
                                      v34,
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
                            "type": "CommitCommentThread",
                            "selections": [
                              v38,
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
                                          v6,
                                          {
                                            "kind": "LinkedField",
                                            "alias": null,
                                            "name": "author",
                                            "storageKey": null,
                                            "args": null,
                                            "concreteType": null,
                                            "plural": false,
                                            "selections": v37
                                          },
                                          v38,
                                          v26,
                                          v29,
                                          v27,
                                          v28
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
                              v39,
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
                              v29
                            ]
                          },
                          {
                            "kind": "InlineFragment",
                            "type": "MergedEvent",
                            "selections": [
                              v39,
                              v38,
                              {
                                "kind": "ScalarField",
                                "alias": null,
                                "name": "mergeRefName",
                                "args": null,
                                "storageKey": null
                              },
                              v29
                            ]
                          },
                          {
                            "kind": "InlineFragment",
                            "type": "IssueComment",
                            "selections": [
                              v25,
                              v26,
                              v29,
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
                                  v7,
                                  v40,
                                  v22
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
                                  v7,
                                  v22,
                                  v40
                                ]
                              },
                              {
                                "kind": "ScalarField",
                                "alias": null,
                                "name": "authoredByCommitter",
                                "args": null,
                                "storageKey": null
                              },
                              v32,
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
                "args": v36,
                "handle": "connection",
                "key": "prTimelineContainer_timeline",
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
                    "selections": v33
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
(node/*: any*/).hash = '443d5e2812d4ab3aca1a33b1e95e1d14';
module.exports = node;
