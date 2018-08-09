import GithubLoginModel from '../../../lib/models/github-login-model';
import WorkdirContextPool from '../../../lib/models/workdir-context-pool';
import BranchSet from '../../../lib/models/branch-set';
import RemoteSet from '../../../lib/models/remote-set';
import {InMemoryStrategy} from '../../../lib/shared/keytar-strategy';
import EnableableOperation from '../../../lib/models/enableable-operation';

export function issueishPaneItemProps(overrides = {}) {
  return {
    loginModel: new GithubLoginModel(InMemoryStrategy),
    workdirContextPool: new WorkdirContextPool(),
    ...overrides,
  };
}

export function issueishDetailContainerProps(overrides = {}) {
  return {
    host: 'https://api.github.com',
    owner: 'owner',
    repo: 'repo',
    issueishNumber: 1,

    loginModel: new GithubLoginModel(InMemoryStrategy),

    switchToIssueish: () => {},
    onTitleChange: () => {},

    ...overrides,
  };
}

export function issueishDetailControllerProps(opts, overrides = {}) {
  const o = {
    repositoryName: 'repository',
    ownerLogin: 'owner',

    omitIssueish: false,
    issueishNumber: 1,
    issueishOverrides: {},

    ...opts,
  };

  return {
    repository: {
      name: o.repositoryName,
      owner: {
        login: o.ownerLogin,
      },
      issueish: o.omitIssueish ? null : issueishDetailViewProps(opts, o.issueishOverrides).issueish,
    },
    issueishNumber: o.issueishNumber,

    branches: new BranchSet(),
    remotes: new RemoteSet(),
    isMerging: false,
    isRebasing: false,
    isAbsent: false,
    isLoading: false,
    isPresent: true,

    fetch: () => {},
    checkout: () => {},
    pull: () => {},
    addRemote: () => {},
    onTitleChange: () => {},
    switchToIssueish: () => {},

    ...overrides,
  };
}

export function issueishDetailViewProps(opts, overrides = {}) {
  const o = {
    repositoryName: 'repository',
    ownerLogin: 'owner',

    issueishKind: 'PullRequest',
    issueishTitle: 'title',
    issueishBodyHTML: '<p>body</p>',
    issueishAuthorLogin: 'author',
    issueishAuthorAvatarURL: 'https://avatars3.githubusercontent.com/u/000?v=4',
    issueishNumber: 1,
    issueishState: 'OPEN',
    issueishHeadRef: 'aw/feature',
    issueishHeadRepoOwner: 'head-owner',
    issueishHeadRepoName: 'head-name',
    issueishReactions: [],
    issueishCommitCount: 0,
    issueishChangedFileCount: 0,

    relayRefetch: () => {},
    ...opts,
  };

  const buildReaction = reaction => {
    return {
      content: reaction.content,
      users: {
        totalCount: reaction.count,
      },
    };
  };

  return {
    relay: {
      refetch: o.relayRefetch,
    },

    repository: {
      id: 'repository0',
      name: o.repositoryName,
      owner: {
        login: o.ownerLogin,
      },
    },

    issueish: {
      id: 'pr0',
      __typename: o.issueishKind,
      title: o.issueishTitle,
      url: o.issueishKind === 'PullRequest'
        ? `https://github.com/${o.ownerLogin}/${o.repositoryName}/pull/${o.issueishNumber}`
        : `https://github.com/${o.ownerLogin}/${o.repositoryName}/issues/${o.issueishNumber}`,
      bodyHTML: o.issueishBodyHTML,
      number: o.issueishNumber,
      state: o.issueishState,
      countedCommits: {
        totalCount: o.issueishCommitCount,
      },
      changedFiles: o.issueishChangedFileCount,
      headRefName: o.issueishHeadRef,
      headRepository: {
        name: o.issueishHeadRepoName,
        owner: {
          login: o.issueishHeadRepoOwner,
        },
        url: `https://github.com/${o.issueishHeadRepoOwner}/${o.issueishHeadRepoName}`,
        sshUrl: `git@github.com:${o.issueishHeadRepoOwner}/${o.issueishHeadRepoName}.git`,
      },
      author: {
        login: o.issueishAuthorLogin,
        avatarUrl: o.issueishAuthorAvatarURL,
        url: `https://github.com/${o.issueishAuthorLogin}`,
      },
      reactionGroups: o.issueishReactions.map(buildReaction),
    },

    checkoutOp: new EnableableOperation(() => {}),
    switchToIssueish: () => {},

    ...overrides,
  };
}
