export function createRepositoryResult(attrs = {}) {
  const o = {
    id: 'repository0',
    defaultRefPrefix: 'refs/heads/',
    defaultRefName: 'master',
    defaultRefID: 'ref0',
    ...attrs,
  }

  return {
    defaultBranchRef: {
      prefix: o.defaultRefPrefix,
      name: o.defaultRefName,
      id: o.defaultRefID,
    },
    id: o.id,
  }
}
