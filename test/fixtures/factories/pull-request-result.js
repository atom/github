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
    states: null,
    headRefName: 'master',
    ...attrs,
  };

  const commit = {
    id: 'commit0',
  };

  if (o.states === null) {
    commit.status = null;
  } else {
    commit.status = {
      contexts: o.states.map((state, id) => ({state, id: `state${id}`})),
    };
  }

  return {
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

    commits: {nodes: [{commit, id: 'node0'}]},
  }
}
