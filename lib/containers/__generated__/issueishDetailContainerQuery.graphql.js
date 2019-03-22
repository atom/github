/**
 * @flow
 * @relayHash 08b1d45cd817c39fb3e4e942e4b2cc58
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteRequest } from 'relay-runtime';
type aggregatedReviewsContainer_pullRequest$ref = any;
type issueishDetailController_repository$ref = any;
export type issueishDetailContainerQueryVariables = {|
  repoOwner: string,
  repoName: string,
  issueishNumber: number,
  timelineCount: number,
  timelineCursor?: ?string,
  commitCount: number,
  commitCursor?: ?string,
  reviewCount: number,
  reviewCursor?: ?string,
  threadCount: number,
  threadCursor?: ?string,
  commentCount: number,
  commentCursor?: ?string,
|};
export type issueishDetailContainerQueryResponse = {|
  +repository: ?{|
    +issueish: ?({|
      +__typename: "PullRequest",
      +$fragmentRefs: aggregatedReviewsContainer_pullRequest$ref,
    |} | {|
      // This will never be '%other', but we need some
      // value in case none of the concrete values match.
      +__typename: "%other"
    |}),
    +$fragmentRefs: issueishDetailController_repository$ref,
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
  $commitCount: Int!
  $commitCursor: String
  $reviewCount: Int!
  $reviewCursor: String
  $threadCount: Int!
  $threadCursor: String
  $commentCount: Int!
  $commentCursor: String
) {
  repository(owner: $repoOwner, name: $repoName) {
    issueish: issueOrPullRequest(number: $issueishNumber) {
      __typename
      ... on PullRequest {
        ...aggregatedReviewsContainer_pullRequest_qdneZ
      }
      ... on Node {
        id
      }
    }
    ...issueishDetailController_repository_1mXVvq
    id
  }
}

fragment aggregatedReviewsContainer_pullRequest_qdneZ on PullRequest {
  id
  ...reviewSummariesAccumulator_pullRequest_2zzc96
  ...reviewThreadsAccumulator_pullRequest_CKDvj
}

fragment issueishDetailController_repository_1mXVvq on Repository {
  ...issueDetailView_repository
  ...prCheckoutController_repository
  ...prDetailView_repository
  name
  owner {
    __typename
    login
    id
  }
  issue: issueOrPullRequest(number: $issueishNumber) {
    __typename
    ... on Issue {
      title
      number
      ...issueDetailView_issue_3D8CP9
    }
    ... on Node {
      id
    }
  }
  pullRequest: issueOrPullRequest(number: $issueishNumber) {
    __typename
    ... on PullRequest {
      title
      number
      ...prCheckoutController_pullRequest
      ...prDetailView_pullRequest_1TnD8A
    }
    ... on Node {
      id
    }
  }
}

fragment issueDetailView_repository on Repository {
  id
  name
  owner {
    __typename
    login
    id
  }
}

fragment prCheckoutController_repository on Repository {
  name
  owner {
    __typename
    login
    id
  }
}

fragment prDetailView_repository on Repository {
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

fragment prCheckoutController_pullRequest on PullRequest {
  number
  headRefName
  headRepository {
    name
    url
    sshUrl
    owner {
      __typename
      login
      id
    }
    id
  }
}

fragment prDetailView_pullRequest_1TnD8A on PullRequest {
  __typename
  ... on Node {
    id
  }
  isCrossRepository
  changedFiles
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

fragment reviewSummariesAccumulator_pullRequest_2zzc96 on PullRequest {
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
        bodyHTML
        state
        submittedAt
        author {
          __typename
          login
          avatarUrl
          ... on Node {
            id
          }
        }
        ... on Reactable {
          reactionGroups {
            content
            users {
              totalCount
            }
          }
        }
        __typename
      }
    }
  }
}

fragment reviewThreadsAccumulator_pullRequest_CKDvj on PullRequest {
  url
  reviewThreads(first: $threadCount, after: $threadCursor) {
    pageInfo {
      hasNextPage
      endCursor
    }
    edges {
      cursor
      node {
        id
        isResolved
        resolvedBy {
          login
          id
        }
        viewerCanResolve
        viewerCanUnresolve
        ...reviewCommentsAccumulator_reviewThread_1VbUmL
        __typename
      }
    }
  }
}

fragment reviewCommentsAccumulator_reviewThread_1VbUmL on PullRequestReviewThread {
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
        bodyHTML
        isMinimized
        minimizedReason
        viewerCanMinimize
        viewerCanReact
        path
        position
        diffHunk
        createdAt
        url
        ... on Reactable {
          reactionGroups {
            content
            users {
              totalCount
            }
          }
        }
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
    "name": "reviewCount",
    "type": "Int!",
    "defaultValue": null
  },
  {
    "kind": "LocalArgument",
    "name": "reviewCursor",
    "type": "String",
    "defaultValue": null
  },
  {
    "kind": "LocalArgument",
    "name": "threadCount",
    "type": "Int!",
    "defaultValue": null
  },
  {
    "kind": "LocalArgument",
    "name": "threadCursor",
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
v2 = [
  {
    "kind": "Variable",
    "name": "number",
    "variableName": "issueishNumber",
    "type": "Int!"
  }
],
v3 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "__typename",
  "args": null,
  "storageKey": null
},
v4 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "id",
  "args": null,
  "storageKey": null
},
v5 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "url",
  "args": null,
  "storageKey": null
},
v6 = [
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
v7 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "hasNextPage",
  "args": null,
  "storageKey": null
},
v8 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "endCursor",
  "args": null,
  "storageKey": null
},
v9 = {
  "kind": "LinkedField",
  "alias": null,
  "name": "pageInfo",
  "storageKey": null,
  "args": null,
  "concreteType": "PageInfo",
  "plural": false,
  "selections": [
    (v7/*: any*/),
    (v8/*: any*/)
  ]
},
v10 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "cursor",
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
  "name": "state",
  "args": null,
  "storageKey": null
},
v13 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "login",
  "args": null,
  "storageKey": null
},
v14 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "avatarUrl",
  "args": null,
  "storageKey": null
},
v15 = [
  (v3/*: any*/),
  (v13/*: any*/),
  (v14/*: any*/),
  (v4/*: any*/)
],
v16 = {
  "kind": "LinkedField",
  "alias": null,
  "name": "author",
  "storageKey": null,
  "args": null,
  "concreteType": null,
  "plural": false,
  "selections": (v15/*: any*/)
},
v17 = [
  {
    "kind": "ScalarField",
    "alias": null,
    "name": "totalCount",
    "args": null,
    "storageKey": null
  }
],
v18 = {
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
      "selections": (v17/*: any*/)
    }
  ]
},
v19 = [
  {
    "kind": "Variable",
    "name": "after",
    "variableName": "threadCursor",
    "type": "String"
  },
  {
    "kind": "Variable",
    "name": "first",
    "variableName": "threadCount",
    "type": "Int"
  }
],
v20 = [
  (v13/*: any*/),
  (v4/*: any*/)
],
v21 = [
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
v22 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "path",
  "args": null,
  "storageKey": null
},
v23 = [
  (v3/*: any*/),
  (v14/*: any*/),
  (v13/*: any*/),
  (v4/*: any*/)
],
v24 = {
  "kind": "LinkedField",
  "alias": null,
  "name": "author",
  "storageKey": null,
  "args": null,
  "concreteType": null,
  "plural": false,
  "selections": (v23/*: any*/)
},
v25 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "position",
  "args": null,
  "storageKey": null
},
v26 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "createdAt",
  "args": null,
  "storageKey": null
},
v27 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "name",
  "args": null,
  "storageKey": null
},
v28 = [
  (v3/*: any*/),
  (v13/*: any*/),
  (v4/*: any*/)
],
v29 = {
  "kind": "LinkedField",
  "alias": null,
  "name": "owner",
  "storageKey": null,
  "args": null,
  "concreteType": null,
  "plural": false,
  "selections": (v28/*: any*/)
},
v30 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "title",
  "args": null,
  "storageKey": null
},
v31 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "number",
  "args": null,
  "storageKey": null
},
v32 = [
  (v5/*: any*/)
],
v33 = {
  "kind": "LinkedField",
  "alias": null,
  "name": "author",
  "storageKey": null,
  "args": null,
  "concreteType": null,
  "plural": false,
  "selections": [
    (v3/*: any*/),
    (v13/*: any*/),
    (v14/*: any*/),
    (v4/*: any*/),
    {
      "kind": "InlineFragment",
      "type": "Bot",
      "selections": (v32/*: any*/)
    },
    {
      "kind": "InlineFragment",
      "type": "User",
      "selections": (v32/*: any*/)
    }
  ]
},
v34 = [
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
v35 = {
  "kind": "LinkedField",
  "alias": null,
  "name": "pageInfo",
  "storageKey": null,
  "args": null,
  "concreteType": "PageInfo",
  "plural": false,
  "selections": [
    (v8/*: any*/),
    (v7/*: any*/)
  ]
},
v36 = {
  "kind": "ScalarField",
  "alias": null,
  "name": "isCrossRepository",
  "args": null,
  "storageKey": null
},
v37 = {
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
    (v36/*: any*/),
    {
      "kind": "LinkedField",
      "alias": null,
      "name": "actor",
      "storageKey": null,
      "args": null,
      "concreteType": null,
      "plural": false,
      "selections": (v15/*: any*/)
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
        (v3/*: any*/),
        {
          "kind": "LinkedField",
          "alias": null,
          "name": "repository",
          "storageKey": null,
          "args": null,
          "concreteType": "Repository",
          "plural": false,
          "selections": [
            (v27/*: any*/),
            (v29/*: any*/),
            (v4/*: any*/),
            {
              "kind": "ScalarField",
              "alias": null,
              "name": "isPrivate",
              "args": null,
              "storageKey": null
            }
          ]
        },
        (v4/*: any*/),
        {
          "kind": "InlineFragment",
          "type": "PullRequest",
          "selections": [
            (v31/*: any*/),
            (v30/*: any*/),
            (v5/*: any*/),
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
            (v31/*: any*/),
            (v30/*: any*/),
            (v5/*: any*/),
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
v38 = {
  "kind": "InlineFragment",
  "type": "IssueComment",
  "selections": [
    (v24/*: any*/),
    (v11/*: any*/),
    (v26/*: any*/),
    (v5/*: any*/)
  ]
},
v39 = {
  "kind": "LinkedField",
  "alias": null,
  "name": "user",
  "storageKey": null,
  "args": null,
  "concreteType": "User",
  "plural": false,
  "selections": (v20/*: any*/)
},
v40 = {
  "kind": "ScalarField",
  "alias": "sha",
  "name": "oid",
  "args": null,
  "storageKey": null
},
v41 = {
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
        (v27/*: any*/),
        (v39/*: any*/),
        (v14/*: any*/)
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
        (v27/*: any*/),
        (v14/*: any*/),
        (v39/*: any*/)
      ]
    },
    {
      "kind": "ScalarField",
      "alias": null,
      "name": "authoredByCommitter",
      "args": null,
      "storageKey": null
    },
    (v40/*: any*/),
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
v42 = [
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
v43 = [
  {
    "kind": "ScalarField",
    "alias": null,
    "name": "oid",
    "args": null,
    "storageKey": null
  },
  (v4/*: any*/)
],
v44 = {
  "kind": "LinkedField",
  "alias": null,
  "name": "commit",
  "storageKey": null,
  "args": null,
  "concreteType": "Commit",
  "plural": false,
  "selections": (v43/*: any*/)
},
v45 = {
  "kind": "LinkedField",
  "alias": null,
  "name": "actor",
  "storageKey": null,
  "args": null,
  "concreteType": null,
  "plural": false,
  "selections": (v23/*: any*/)
};
return {
  "kind": "Request",
  "fragment": {
    "kind": "Fragment",
    "name": "issueishDetailContainerQuery",
    "type": "Query",
    "metadata": null,
    "argumentDefinitions": (v0/*: any*/),
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "name": "repository",
        "storageKey": null,
        "args": (v1/*: any*/),
        "concreteType": "Repository",
        "plural": false,
        "selections": [
          {
            "kind": "LinkedField",
            "alias": "issueish",
            "name": "issueOrPullRequest",
            "storageKey": null,
            "args": (v2/*: any*/),
            "concreteType": null,
            "plural": false,
            "selections": [
              (v3/*: any*/),
              {
                "kind": "InlineFragment",
                "type": "PullRequest",
                "selections": [
                  {
                    "kind": "FragmentSpread",
                    "name": "aggregatedReviewsContainer_pullRequest",
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
                      {
                        "kind": "Variable",
                        "name": "threadCount",
                        "variableName": "threadCount",
                        "type": null
                      },
                      {
                        "kind": "Variable",
                        "name": "threadCursor",
                        "variableName": "threadCursor",
                        "type": null
                      }
                    ]
                  }
                ]
              }
            ]
          },
          {
            "kind": "FragmentSpread",
            "name": "issueishDetailController_repository",
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
              },
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
    "argumentDefinitions": (v0/*: any*/),
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "name": "repository",
        "storageKey": null,
        "args": (v1/*: any*/),
        "concreteType": "Repository",
        "plural": false,
        "selections": [
          {
            "kind": "LinkedField",
            "alias": "issueish",
            "name": "issueOrPullRequest",
            "storageKey": null,
            "args": (v2/*: any*/),
            "concreteType": null,
            "plural": false,
            "selections": [
              (v3/*: any*/),
              (v4/*: any*/),
              {
                "kind": "InlineFragment",
                "type": "PullRequest",
                "selections": [
                  (v5/*: any*/),
                  {
                    "kind": "LinkedField",
                    "alias": null,
                    "name": "reviews",
                    "storageKey": null,
                    "args": (v6/*: any*/),
                    "concreteType": "PullRequestReviewConnection",
                    "plural": false,
                    "selections": [
                      (v9/*: any*/),
                      {
                        "kind": "LinkedField",
                        "alias": null,
                        "name": "edges",
                        "storageKey": null,
                        "args": null,
                        "concreteType": "PullRequestReviewEdge",
                        "plural": true,
                        "selections": [
                          (v10/*: any*/),
                          {
                            "kind": "LinkedField",
                            "alias": null,
                            "name": "node",
                            "storageKey": null,
                            "args": null,
                            "concreteType": "PullRequestReview",
                            "plural": false,
                            "selections": [
                              (v4/*: any*/),
                              (v11/*: any*/),
                              (v12/*: any*/),
                              {
                                "kind": "ScalarField",
                                "alias": null,
                                "name": "submittedAt",
                                "args": null,
                                "storageKey": null
                              },
                              (v16/*: any*/),
                              (v18/*: any*/),
                              (v3/*: any*/)
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
                    "args": (v6/*: any*/),
                    "handle": "connection",
                    "key": "ReviewSummariesAccumulator_reviews",
                    "filters": null
                  },
                  {
                    "kind": "LinkedField",
                    "alias": null,
                    "name": "reviewThreads",
                    "storageKey": null,
                    "args": (v19/*: any*/),
                    "concreteType": "PullRequestReviewThreadConnection",
                    "plural": false,
                    "selections": [
                      (v9/*: any*/),
                      {
                        "kind": "LinkedField",
                        "alias": null,
                        "name": "edges",
                        "storageKey": null,
                        "args": null,
                        "concreteType": "PullRequestReviewThreadEdge",
                        "plural": true,
                        "selections": [
                          (v10/*: any*/),
                          {
                            "kind": "LinkedField",
                            "alias": null,
                            "name": "node",
                            "storageKey": null,
                            "args": null,
                            "concreteType": "PullRequestReviewThread",
                            "plural": false,
                            "selections": [
                              (v4/*: any*/),
                              {
                                "kind": "ScalarField",
                                "alias": null,
                                "name": "isResolved",
                                "args": null,
                                "storageKey": null
                              },
                              {
                                "kind": "LinkedField",
                                "alias": null,
                                "name": "resolvedBy",
                                "storageKey": null,
                                "args": null,
                                "concreteType": "User",
                                "plural": false,
                                "selections": (v20/*: any*/)
                              },
                              {
                                "kind": "ScalarField",
                                "alias": null,
                                "name": "viewerCanResolve",
                                "args": null,
                                "storageKey": null
                              },
                              {
                                "kind": "ScalarField",
                                "alias": null,
                                "name": "viewerCanUnresolve",
                                "args": null,
                                "storageKey": null
                              },
                              {
                                "kind": "LinkedField",
                                "alias": null,
                                "name": "comments",
                                "storageKey": null,
                                "args": (v21/*: any*/),
                                "concreteType": "PullRequestReviewCommentConnection",
                                "plural": false,
                                "selections": [
                                  (v9/*: any*/),
                                  {
                                    "kind": "LinkedField",
                                    "alias": null,
                                    "name": "edges",
                                    "storageKey": null,
                                    "args": null,
                                    "concreteType": "PullRequestReviewCommentEdge",
                                    "plural": true,
                                    "selections": [
                                      (v10/*: any*/),
                                      {
                                        "kind": "LinkedField",
                                        "alias": null,
                                        "name": "node",
                                        "storageKey": null,
                                        "args": null,
                                        "concreteType": "PullRequestReviewComment",
                                        "plural": false,
                                        "selections": [
                                          (v22/*: any*/),
                                          (v4/*: any*/),
                                          (v11/*: any*/),
                                          {
                                            "kind": "ScalarField",
                                            "alias": null,
                                            "name": "isMinimized",
                                            "args": null,
                                            "storageKey": null
                                          },
                                          {
                                            "kind": "ScalarField",
                                            "alias": null,
                                            "name": "minimizedReason",
                                            "args": null,
                                            "storageKey": null
                                          },
                                          {
                                            "kind": "ScalarField",
                                            "alias": null,
                                            "name": "viewerCanMinimize",
                                            "args": null,
                                            "storageKey": null
                                          },
                                          {
                                            "kind": "ScalarField",
                                            "alias": null,
                                            "name": "viewerCanReact",
                                            "args": null,
                                            "storageKey": null
                                          },
                                          (v24/*: any*/),
                                          (v25/*: any*/),
                                          {
                                            "kind": "ScalarField",
                                            "alias": null,
                                            "name": "diffHunk",
                                            "args": null,
                                            "storageKey": null
                                          },
                                          (v26/*: any*/),
                                          (v5/*: any*/),
                                          (v18/*: any*/),
                                          (v3/*: any*/)
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
                                "args": (v21/*: any*/),
                                "handle": "connection",
                                "key": "ReviewCommentsAccumulator_comments",
                                "filters": null
                              },
                              (v3/*: any*/)
                            ]
                          }
                        ]
                      }
                    ]
                  },
                  {
                    "kind": "LinkedHandle",
                    "alias": null,
                    "name": "reviewThreads",
                    "args": (v19/*: any*/),
                    "handle": "connection",
                    "key": "ReviewThreadsAccumulator_reviewThreads",
                    "filters": null
                  }
                ]
              }
            ]
          },
          (v4/*: any*/),
          (v27/*: any*/),
          (v29/*: any*/),
          {
            "kind": "LinkedField",
            "alias": "issue",
            "name": "issueOrPullRequest",
            "storageKey": null,
            "args": (v2/*: any*/),
            "concreteType": null,
            "plural": false,
            "selections": [
              (v3/*: any*/),
              (v4/*: any*/),
              {
                "kind": "InlineFragment",
                "type": "Issue",
                "selections": [
                  (v30/*: any*/),
                  (v31/*: any*/),
                  (v12/*: any*/),
                  (v11/*: any*/),
                  (v33/*: any*/),
                  (v5/*: any*/),
                  {
                    "kind": "LinkedField",
                    "alias": null,
                    "name": "timeline",
                    "storageKey": null,
                    "args": (v34/*: any*/),
                    "concreteType": "IssueTimelineConnection",
                    "plural": false,
                    "selections": [
                      (v35/*: any*/),
                      {
                        "kind": "LinkedField",
                        "alias": null,
                        "name": "edges",
                        "storageKey": null,
                        "args": null,
                        "concreteType": "IssueTimelineItemEdge",
                        "plural": true,
                        "selections": [
                          (v10/*: any*/),
                          {
                            "kind": "LinkedField",
                            "alias": null,
                            "name": "node",
                            "storageKey": null,
                            "args": null,
                            "concreteType": null,
                            "plural": false,
                            "selections": [
                              (v3/*: any*/),
                              (v4/*: any*/),
                              (v37/*: any*/),
                              (v38/*: any*/),
                              (v41/*: any*/)
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
                    "args": (v34/*: any*/),
                    "handle": "connection",
                    "key": "IssueTimelineController_timeline",
                    "filters": null
                  },
                  (v18/*: any*/)
                ]
              }
            ]
          },
          {
            "kind": "LinkedField",
            "alias": "pullRequest",
            "name": "issueOrPullRequest",
            "storageKey": null,
            "args": (v2/*: any*/),
            "concreteType": null,
            "plural": false,
            "selections": [
              (v3/*: any*/),
              (v4/*: any*/),
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
                    "selections": (v17/*: any*/)
                  },
                  (v30/*: any*/),
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
                      (v27/*: any*/),
                      (v5/*: any*/),
                      {
                        "kind": "ScalarField",
                        "alias": null,
                        "name": "sshUrl",
                        "args": null,
                        "storageKey": null
                      },
                      (v29/*: any*/),
                      (v4/*: any*/)
                    ]
                  },
                  (v36/*: any*/),
                  {
                    "kind": "ScalarField",
                    "alias": null,
                    "name": "changedFiles",
                    "args": null,
                    "storageKey": null
                  },
                  (v5/*: any*/),
                  {
                    "kind": "LinkedField",
                    "alias": null,
                    "name": "commits",
                    "storageKey": null,
                    "args": (v42/*: any*/),
                    "concreteType": "PullRequestCommitConnection",
                    "plural": false,
                    "selections": [
                      (v35/*: any*/),
                      {
                        "kind": "LinkedField",
                        "alias": null,
                        "name": "edges",
                        "storageKey": null,
                        "args": null,
                        "concreteType": "PullRequestCommitEdge",
                        "plural": true,
                        "selections": [
                          (v10/*: any*/),
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
                                  (v4/*: any*/),
                                  {
                                    "kind": "LinkedField",
                                    "alias": null,
                                    "name": "committer",
                                    "storageKey": null,
                                    "args": null,
                                    "concreteType": "GitActor",
                                    "plural": false,
                                    "selections": [
                                      (v14/*: any*/),
                                      (v27/*: any*/),
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
                                  (v40/*: any*/),
                                  (v5/*: any*/)
                                ]
                              },
                              (v4/*: any*/),
                              (v3/*: any*/)
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
                    "args": (v42/*: any*/),
                    "handle": "connection",
                    "key": "prCommitsView_commits",
                    "filters": null
                  },
                  (v31/*: any*/),
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
                                      (v12/*: any*/),
                                      {
                                        "kind": "LinkedField",
                                        "alias": null,
                                        "name": "contexts",
                                        "storageKey": null,
                                        "args": null,
                                        "concreteType": "StatusContext",
                                        "plural": true,
                                        "selections": [
                                          (v4/*: any*/),
                                          (v12/*: any*/),
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
                                      (v4/*: any*/)
                                    ]
                                  },
                                  (v4/*: any*/)
                                ]
                              },
                              (v4/*: any*/)
                            ]
                          }
                        ]
                      }
                    ]
                  },
                  (v12/*: any*/),
                  (v11/*: any*/),
                  {
                    "kind": "ScalarField",
                    "alias": null,
                    "name": "baseRefName",
                    "args": null,
                    "storageKey": null
                  },
                  (v33/*: any*/),
                  {
                    "kind": "LinkedField",
                    "alias": null,
                    "name": "headRepositoryOwner",
                    "storageKey": null,
                    "args": null,
                    "concreteType": null,
                    "plural": false,
                    "selections": (v28/*: any*/)
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
                      (v29/*: any*/),
                      (v4/*: any*/)
                    ]
                  },
                  {
                    "kind": "LinkedField",
                    "alias": null,
                    "name": "timeline",
                    "storageKey": null,
                    "args": (v34/*: any*/),
                    "concreteType": "PullRequestTimelineConnection",
                    "plural": false,
                    "selections": [
                      (v35/*: any*/),
                      {
                        "kind": "LinkedField",
                        "alias": null,
                        "name": "edges",
                        "storageKey": null,
                        "args": null,
                        "concreteType": "PullRequestTimelineItemEdge",
                        "plural": true,
                        "selections": [
                          (v10/*: any*/),
                          {
                            "kind": "LinkedField",
                            "alias": null,
                            "name": "node",
                            "storageKey": null,
                            "args": null,
                            "concreteType": null,
                            "plural": false,
                            "selections": [
                              (v3/*: any*/),
                              (v4/*: any*/),
                              (v37/*: any*/),
                              {
                                "kind": "InlineFragment",
                                "type": "CommitCommentThread",
                                "selections": [
                                  (v44/*: any*/),
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
                                              (v4/*: any*/),
                                              (v16/*: any*/),
                                              (v44/*: any*/),
                                              (v11/*: any*/),
                                              (v26/*: any*/),
                                              (v22/*: any*/),
                                              (v25/*: any*/)
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
                                  (v45/*: any*/),
                                  {
                                    "kind": "LinkedField",
                                    "alias": null,
                                    "name": "beforeCommit",
                                    "storageKey": null,
                                    "args": null,
                                    "concreteType": "Commit",
                                    "plural": false,
                                    "selections": (v43/*: any*/)
                                  },
                                  {
                                    "kind": "LinkedField",
                                    "alias": null,
                                    "name": "afterCommit",
                                    "storageKey": null,
                                    "args": null,
                                    "concreteType": "Commit",
                                    "plural": false,
                                    "selections": (v43/*: any*/)
                                  },
                                  (v26/*: any*/)
                                ]
                              },
                              {
                                "kind": "InlineFragment",
                                "type": "MergedEvent",
                                "selections": [
                                  (v45/*: any*/),
                                  (v44/*: any*/),
                                  {
                                    "kind": "ScalarField",
                                    "alias": null,
                                    "name": "mergeRefName",
                                    "args": null,
                                    "storageKey": null
                                  },
                                  (v26/*: any*/)
                                ]
                              },
                              (v38/*: any*/),
                              (v41/*: any*/)
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
                    "args": (v34/*: any*/),
                    "handle": "connection",
                    "key": "prTimelineContainer_timeline",
                    "filters": null
                  },
                  (v18/*: any*/)
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  "params": {
    "operationKind": "query",
    "name": "issueishDetailContainerQuery",
    "id": null,
    "text": "query issueishDetailContainerQuery(\n  $repoOwner: String!\n  $repoName: String!\n  $issueishNumber: Int!\n  $timelineCount: Int!\n  $timelineCursor: String\n  $commitCount: Int!\n  $commitCursor: String\n  $reviewCount: Int!\n  $reviewCursor: String\n  $threadCount: Int!\n  $threadCursor: String\n  $commentCount: Int!\n  $commentCursor: String\n) {\n  repository(owner: $repoOwner, name: $repoName) {\n    issueish: issueOrPullRequest(number: $issueishNumber) {\n      __typename\n      ... on PullRequest {\n        ...aggregatedReviewsContainer_pullRequest_qdneZ\n      }\n      ... on Node {\n        id\n      }\n    }\n    ...issueishDetailController_repository_1mXVvq\n    id\n  }\n}\n\nfragment aggregatedReviewsContainer_pullRequest_qdneZ on PullRequest {\n  id\n  ...reviewSummariesAccumulator_pullRequest_2zzc96\n  ...reviewThreadsAccumulator_pullRequest_CKDvj\n}\n\nfragment issueishDetailController_repository_1mXVvq on Repository {\n  ...issueDetailView_repository\n  ...prCheckoutController_repository\n  ...prDetailView_repository\n  name\n  owner {\n    __typename\n    login\n    id\n  }\n  issue: issueOrPullRequest(number: $issueishNumber) {\n    __typename\n    ... on Issue {\n      title\n      number\n      ...issueDetailView_issue_3D8CP9\n    }\n    ... on Node {\n      id\n    }\n  }\n  pullRequest: issueOrPullRequest(number: $issueishNumber) {\n    __typename\n    ... on PullRequest {\n      title\n      number\n      ...prCheckoutController_pullRequest\n      ...prDetailView_pullRequest_1TnD8A\n    }\n    ... on Node {\n      id\n    }\n  }\n}\n\nfragment issueDetailView_repository on Repository {\n  id\n  name\n  owner {\n    __typename\n    login\n    id\n  }\n}\n\nfragment prCheckoutController_repository on Repository {\n  name\n  owner {\n    __typename\n    login\n    id\n  }\n}\n\nfragment prDetailView_repository on Repository {\n  id\n  name\n  owner {\n    __typename\n    login\n    id\n  }\n}\n\nfragment issueDetailView_issue_3D8CP9 on Issue {\n  __typename\n  ... on Node {\n    id\n  }\n  state\n  number\n  title\n  bodyHTML\n  author {\n    __typename\n    login\n    avatarUrl\n    ... on User {\n      url\n    }\n    ... on Bot {\n      url\n    }\n    ... on Node {\n      id\n    }\n  }\n  ...issueTimelineController_issue_3D8CP9\n  ... on UniformResourceLocatable {\n    url\n  }\n  ... on Reactable {\n    reactionGroups {\n      content\n      users {\n        totalCount\n      }\n    }\n  }\n}\n\nfragment prCheckoutController_pullRequest on PullRequest {\n  number\n  headRefName\n  headRepository {\n    name\n    url\n    sshUrl\n    owner {\n      __typename\n      login\n      id\n    }\n    id\n  }\n}\n\nfragment prDetailView_pullRequest_1TnD8A on PullRequest {\n  __typename\n  ... on Node {\n    id\n  }\n  isCrossRepository\n  changedFiles\n  ...prCommitsView_pullRequest_38TpXw\n  countedCommits: commits {\n    totalCount\n  }\n  ...prStatusesView_pullRequest\n  state\n  number\n  title\n  bodyHTML\n  baseRefName\n  headRefName\n  author {\n    __typename\n    login\n    avatarUrl\n    ... on User {\n      url\n    }\n    ... on Bot {\n      url\n    }\n    ... on Node {\n      id\n    }\n  }\n  ...prTimelineController_pullRequest_3D8CP9\n  ... on UniformResourceLocatable {\n    url\n  }\n  ... on Reactable {\n    reactionGroups {\n      content\n      users {\n        totalCount\n      }\n    }\n  }\n}\n\nfragment prCommitsView_pullRequest_38TpXw on PullRequest {\n  url\n  commits(first: $commitCount, after: $commitCursor) {\n    pageInfo {\n      endCursor\n      hasNextPage\n    }\n    edges {\n      cursor\n      node {\n        commit {\n          id\n          ...prCommitView_item\n        }\n        id\n        __typename\n      }\n    }\n  }\n}\n\nfragment prStatusesView_pullRequest on PullRequest {\n  id\n  recentCommits: commits(last: 1) {\n    edges {\n      node {\n        commit {\n          status {\n            state\n            contexts {\n              id\n              state\n              ...prStatusContextView_context\n            }\n            id\n          }\n          id\n        }\n        id\n      }\n    }\n  }\n}\n\nfragment prTimelineController_pullRequest_3D8CP9 on PullRequest {\n  url\n  ...headRefForcePushedEventView_issueish\n  timeline(first: $timelineCount, after: $timelineCursor) {\n    pageInfo {\n      endCursor\n      hasNextPage\n    }\n    edges {\n      cursor\n      node {\n        __typename\n        ...commitsView_nodes\n        ...issueCommentView_item\n        ...mergedEventView_item\n        ...headRefForcePushedEventView_item\n        ...commitCommentThreadView_item\n        ...crossReferencedEventsView_nodes\n        ... on Node {\n          id\n        }\n      }\n    }\n  }\n}\n\nfragment headRefForcePushedEventView_issueish on PullRequest {\n  headRefName\n  headRepositoryOwner {\n    __typename\n    login\n    id\n  }\n  repository {\n    owner {\n      __typename\n      login\n      id\n    }\n    id\n  }\n}\n\nfragment commitsView_nodes on Commit {\n  id\n  author {\n    name\n    user {\n      login\n      id\n    }\n  }\n  ...commitView_commit\n}\n\nfragment issueCommentView_item on IssueComment {\n  author {\n    __typename\n    avatarUrl\n    login\n    ... on Node {\n      id\n    }\n  }\n  bodyHTML\n  createdAt\n  url\n}\n\nfragment mergedEventView_item on MergedEvent {\n  actor {\n    __typename\n    avatarUrl\n    login\n    ... on Node {\n      id\n    }\n  }\n  commit {\n    oid\n    id\n  }\n  mergeRefName\n  createdAt\n}\n\nfragment headRefForcePushedEventView_item on HeadRefForcePushedEvent {\n  actor {\n    __typename\n    avatarUrl\n    login\n    ... on Node {\n      id\n    }\n  }\n  beforeCommit {\n    oid\n    id\n  }\n  afterCommit {\n    oid\n    id\n  }\n  createdAt\n}\n\nfragment commitCommentThreadView_item on CommitCommentThread {\n  commit {\n    oid\n    id\n  }\n  comments(first: 100) {\n    edges {\n      node {\n        id\n        ...commitCommentView_item\n      }\n    }\n  }\n}\n\nfragment crossReferencedEventsView_nodes on CrossReferencedEvent {\n  id\n  referencedAt\n  isCrossRepository\n  actor {\n    __typename\n    login\n    avatarUrl\n    ... on Node {\n      id\n    }\n  }\n  source {\n    __typename\n    ... on RepositoryNode {\n      repository {\n        name\n        owner {\n          __typename\n          login\n          id\n        }\n        id\n      }\n    }\n    ... on Node {\n      id\n    }\n  }\n  ...crossReferencedEventView_item\n}\n\nfragment crossReferencedEventView_item on CrossReferencedEvent {\n  id\n  isCrossRepository\n  source {\n    __typename\n    ... on Issue {\n      number\n      title\n      url\n      issueState: state\n    }\n    ... on PullRequest {\n      number\n      title\n      url\n      prState: state\n    }\n    ... on RepositoryNode {\n      repository {\n        name\n        isPrivate\n        owner {\n          __typename\n          login\n          id\n        }\n        id\n      }\n    }\n    ... on Node {\n      id\n    }\n  }\n}\n\nfragment commitCommentView_item on CommitComment {\n  author {\n    __typename\n    login\n    avatarUrl\n    ... on Node {\n      id\n    }\n  }\n  commit {\n    oid\n    id\n  }\n  bodyHTML\n  createdAt\n  path\n  position\n}\n\nfragment commitView_commit on Commit {\n  author {\n    name\n    avatarUrl\n    user {\n      login\n      id\n    }\n  }\n  committer {\n    name\n    avatarUrl\n    user {\n      login\n      id\n    }\n  }\n  authoredByCommitter\n  sha: oid\n  message\n  messageHeadlineHTML\n  commitUrl\n}\n\nfragment prStatusContextView_context on StatusContext {\n  context\n  description\n  state\n  targetUrl\n}\n\nfragment prCommitView_item on Commit {\n  committer {\n    avatarUrl\n    name\n    date\n  }\n  messageHeadline\n  messageBody\n  shortSha: abbreviatedOid\n  sha: oid\n  url\n}\n\nfragment issueTimelineController_issue_3D8CP9 on Issue {\n  url\n  timeline(first: $timelineCount, after: $timelineCursor) {\n    pageInfo {\n      endCursor\n      hasNextPage\n    }\n    edges {\n      cursor\n      node {\n        __typename\n        ...commitsView_nodes\n        ...issueCommentView_item\n        ...crossReferencedEventsView_nodes\n        ... on Node {\n          id\n        }\n      }\n    }\n  }\n}\n\nfragment reviewSummariesAccumulator_pullRequest_2zzc96 on PullRequest {\n  url\n  reviews(first: $reviewCount, after: $reviewCursor) {\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    edges {\n      cursor\n      node {\n        id\n        bodyHTML\n        state\n        submittedAt\n        author {\n          __typename\n          login\n          avatarUrl\n          ... on Node {\n            id\n          }\n        }\n        ... on Reactable {\n          reactionGroups {\n            content\n            users {\n              totalCount\n            }\n          }\n        }\n        __typename\n      }\n    }\n  }\n}\n\nfragment reviewThreadsAccumulator_pullRequest_CKDvj on PullRequest {\n  url\n  reviewThreads(first: $threadCount, after: $threadCursor) {\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    edges {\n      cursor\n      node {\n        id\n        isResolved\n        resolvedBy {\n          login\n          id\n        }\n        viewerCanResolve\n        viewerCanUnresolve\n        ...reviewCommentsAccumulator_reviewThread_1VbUmL\n        __typename\n      }\n    }\n  }\n}\n\nfragment reviewCommentsAccumulator_reviewThread_1VbUmL on PullRequestReviewThread {\n  id\n  comments(first: $commentCount, after: $commentCursor) {\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    edges {\n      cursor\n      node {\n        id\n        author {\n          __typename\n          avatarUrl\n          login\n          ... on Node {\n            id\n          }\n        }\n        bodyHTML\n        isMinimized\n        minimizedReason\n        viewerCanMinimize\n        viewerCanReact\n        path\n        position\n        diffHunk\n        createdAt\n        url\n        ... on Reactable {\n          reactionGroups {\n            content\n            users {\n              totalCount\n            }\n          }\n        }\n        __typename\n      }\n    }\n  }\n}\n",
    "metadata": {}
  }
};
})();
// prettier-ignore
(node/*: any*/).hash = 'f0f0b983d5648d6435cb0a818dcdf081';
module.exports = node;
