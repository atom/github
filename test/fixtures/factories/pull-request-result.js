function createCommitResult(attrs = {}) {
  return {
    commit: {
      status: {
        contexts: [ {state: 'PASSED'} ]
      }
    }
  };
}

export function createPullRequestResult(attrs = {}) {
  const o = {
    number: 0,
    repositoryID: 'repository0',
    summaryState: null,
    states: null,
    headRefName: 'master',
    includeEdges: false,
    ...attrs,
  };

  if (o.summaryState && !o.states) {
    o.states = [o.summaryState];
  }

  const commit = {
    id: 'commit0',
  };

  if (o.states === null) {
    commit.status = null;
  } else {
    commit.status = {
      state: o.summaryState,
      contexts: o.states.map((state, id) => ({state, id: `state${id}`})),
    };
  }

  const commits = o.includeEdges
    ? {edges: [{node: {id: 'node0', commit}}]}
    : {nodes: [{commit, id: 'node0'}]};

  return {
    __typename: 'PullRequest',
    id: `pullrequest${o.number}`,
    number: o.number,
    title: `Pull Request ${o.number}`,
    url: `https://github.com/owner/repo/pulls/${o.number}`,
    author: {
      __typename: 'User',
      login: 'me',
      avatarUrl: 'https://avatars3.githubusercontent.com/u/000?v=4',
      id: 'user0'
    },
    createdAt: '2018-06-12T14:50:08Z',
    headRefName: o.headRefName,

    repository: {
      id: o.repositoryID,
    },

    commits,
  }
}

export function createPullRequestDetailResult(attrs = {}) {
  const o = {
    number: 0,
    title: 'title',
    state: 'OPEN',
    authorLogin: 'me',
    authorAvatarURL: 'https://avatars3.githubusercontent.com/u/000?v=4',
    headRefName: 'headref',
    headRepositoryLogin: 'headlogin',
    baseRepositoryLogin: 'baseLogin',
    ...attrs,
  };

  const commit = {
    id: 'commit0',
    status: null,
  };

  return {
    __typename: 'PullRequest',
    id: `pullrequest${o.number}`,
    title: o.title,
    number: o.number,
    state: o.state,
    bodyHTML: '<p>body</p>',
    author: {
      __typename: 'User',
      id: `user${o.authorLogin}`,
      login: o.authorLogin,
      avatarUrl: o.authorAvatarURL,
      url: `https://github.com/${o.authorLogin}`,
    },
    url: `https://github.com/owner/repo/pull/${o.number}`,
    reactionGroups: [],
    commits: {
      edges: [{
        node: {commit, id: 'node0'}
      }],
    },
    timeline: {
      pageInfo: {
        endCursor: 'end',
        hasNextPage: false,
      },
      edges: [],
    },
    headRefName: o.headRefName,
    headRepositoryOwner: {
      __typename: 'User',
      id: `user${o.headRepositoryLogin}`,
      login: o.headRepositoryLogin,
    },
    repository: {
      owner: {
        __typename: 'User',
        id: `user${o.baseRepositoryLogin}`,
        login: o.baseRepositoryLogin,
      },
      id: 'baserepository',
    }
  };
}
