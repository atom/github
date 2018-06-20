function createCommitResult(attrs) {
  return {
    commit: {
      status: {
        contexts: [ {state: 'PASSED'} ]
      }
    }
  };
}

export function createPullRequestResult(attrs) {
  const o = {
    number: 0,
    states: [],
    headRefName: 'master',
    ...attrs,
  }

  const commit = {
    status: {
      contexts: o.states.map((state, id) => ({state, id: `state${id}`})),
      id: 'status0',
    },
    id: 'commit0'
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

    commits: {nodes: [{commit, id: 'node0'}]},
  }
}
