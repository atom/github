import IDGenerator from './id-generator';

export function createCommitComment(opts = {}) {
  const idGen = IDGenerator.fromOpts(opts);

  const o = {
    id: idGen.generate('comment-comment'),
    commitOid: '1234abcd',
    authorLogin: 'author0',
    authorAvatar: 'https://avatars2.githubusercontent.com/u/0?v=12',
    bodyHTML: '<p>body</p>',
    createdAt: '2018-06-28T15:04:05Z',
    commentPath: null,
    ...opts,
  };

  return {
    id: o.id,
    author: {
      __typename: 'User',
      id: idGen.generate('user'),
      login: o.authorLogin,
      avatarUrl: o.authorAvatar,
    },
    commit: {
      oid: o.commitOid,
    },
    bodyHtml: o.bodyHtml,
    createdAt: o.createdAt,
    path: o.commentPath,
  };
}

export function createCommitCommentThread(opts = {}) {
  const idGen = IDGenerator.fromOpts(opts);

  const o = {
    id: idGen.generate('commit-comment-thread'),
    commitOid: '1234abcd',
    commitCommentOpts: [],
    ...opts,
  };

  return {
    id: o.id,
    commit: {
      oid: o.commitOid,
    },
    comments: {
      edges: o.commitCommentOpts.map(eachOpts => {
        return {
          node: createCommitComment({
            ...idGen.embed(),
            ...eachOpts,
          }),
        }
      }),
    },
  };
}
