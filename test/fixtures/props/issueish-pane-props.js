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

    omitPullRequestData: false,
    omitIssueData: false,
    issueishNumber: 1,
    pullRequestOverrides: {},
    issueOverrides: {},

    ...opts,
  };

  return {
    repository: {
      name: o.repositoryName,
      owner: {
        login: o.ownerLogin,
      },
      pullRequest: o.omitPullRequestData ? null : pullRequestDetailViewProps(opts, o.pullRequestOverrides).pullRequest,
      issue: o.omitIssueData ? null : issueDetailViewProps(opts, o.issueOverrides).issue,
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

export function pullRequestDetailViewProps(opts, overrides = {}) {
  const o = {
    repositoryName: 'repository',
    ownerLogin: 'owner',

    pullRequestKind: 'PullRequest',
    pullRequestTitle: 'title',
    pullRequestBodyHTML: '<p>body</p>',
    pullRequestBaseRef: 'master',
    pullRequestAuthorLogin: 'author',
    pullRequestAuthorAvatarURL: 'https://avatars3.githubusercontent.com/u/000?v=4',
    issueishNumber: 1,
    pullRequestState: 'OPEN',
    pullRequestHeadRef: 'aw/feature',
    pullRequestHeadRepoOwner: 'head-owner',
    pullRequestHeadRepoName: 'head-name',
    pullRequestReactions: [],
    pullRequestCommitCount: 0,
    pullRequestChangedFileCount: 0,
    pullRequestCrossRepository: false,

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

    pullRequest: {
      id: 'pr0',
      __typename: o.pullRequestKind,
      title: o.pullRequestTitle,
      url: `https://github.com/${o.ownerLogin}/${o.repositoryName}/pull/${o.issueishNumber}`,
      bodyHTML: o.pullRequestBodyHTML,
      number: o.issueishNumber,
      state: o.pullRequestState,
      countedCommits: {
        totalCount: o.pullRequestCommitCount,
      },
      isCrossRepository: o.pullRequestCrossRepository,
      changedFiles: o.pullRequestChangedFileCount,
      baseRefName: o.pullRequestBaseRef,
      headRefName: o.pullRequestHeadRef,
      headRepository: {
        name: o.pullRequestHeadRepoName,
        owner: {
          login: o.pullRequestHeadRepoOwner,
        },
        url: `https://github.com/${o.pullRequestHeadRepoOwner}/${o.pullRequestHeadRepoName}`,
        sshUrl: `git@github.com:${o.pullRequestHeadRepoOwner}/${o.pullRequestHeadRepoName}.git`,
      },
      author: {
        login: o.pullRequestAuthorLogin,
        avatarUrl: o.pullRequestAuthorAvatarURL,
        url: `https://github.com/${o.pullRequestAuthorLogin}`,
      },
      reactionGroups: o.pullRequestReactions.map(buildReaction),
    },

    checkoutOp: new EnableableOperation(() => {}),
    switchToIssueish: () => {},

    ...overrides,
  };
}

export function issueDetailViewProps(opts, overrides = {}) {
  const o = {
    repositoryName: 'repository',
    ownerLogin: 'owner',

    issueKind: 'Issue',
    issueTitle: 'title',
    issueBodyHTML: '<p>body</p>',
    issueBaseRef: 'master',
    issueAuthorLogin: 'author',
    issueAuthorAvatarURL: 'https://avatars3.githubusercontent.com/u/000?v=4',
    issueishNumber: 1,
    issueState: 'OPEN',
    issueHeadRef: 'aw/feature',
    issueHeadRepoOwner: 'head-owner',
    issueHeadRepoName: 'head-name',
    issueReactions: [],

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

    issue: {
      id: 'issue0',
      __typename: o.issueKind,
      title: o.issueTitle,
      url: `https://github.com/${o.ownerLogin}/${o.repositoryName}/issues/${o.issueishNumber}`,
      bodyHTML: o.issueBodyHTML,
      number: o.issueishNumber,
      state: o.issueState,
      headRepository: {
        name: o.issueHeadRepoName,
        owner: {
          login: o.issueHeadRepoOwner,
        },
        url: `https://github.com/${o.issueHeadRepoOwner}/${o.issueHeadRepoName}`,
        sshUrl: `git@github.com:${o.issueHeadRepoOwner}/${o.issueHeadRepoName}.git`,
      },
      author: {
        login: o.issueAuthorLogin,
        avatarUrl: o.issueAuthorAvatarURL,
        url: `https://github.com/${o.issueAuthorLogin}`,
      },
      reactionGroups: o.issueReactions.map(buildReaction),
    },

    switchToIssueish: () => {},

    ...overrides,
  };
}
