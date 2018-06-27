import GithubLoginModel from '../../../lib/models/github-login-model';
import {InMemoryStrategy} from '../../../lib/shared/keytar-strategy';

export function issueishPaneItemProps(overrides = {}) {
  return {
    loginModel: new GithubLoginModel(InMemoryStrategy),
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

    onTitleChange: () => {},
    switchToIssueish: () => {},

    ...overrides,
  };
}

export function issueishDetailViewProps(opts, overrides = {}) {
  const o = {
    issueishKind: 'PullRequest',

    repositoryName: 'repository',
    ownerLogin: 'owner',

    issueishTitle: 'title',
    issueishBodyHTML: '<p>body</p>',
    issueishAuthorLogin: 'author',
    issueishAuthorAvatarURL: 'https://avatars3.githubusercontent.com/u/000?v=4',
    issueishNumber: 1,
    issueishState: 'OPEN',

    relayRefetch: () => {},
    ...opts,
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
      bodyHTML: o.issueishBodyHTML,
      number: o.issueishNumber,
      state: o.issueishState,
      author: {
        login: o.issueishAuthorLogin,
        avatarUrl: o.issueishAuthorAvatarURL,
        url: `https://github.com/${o.issueishAuthorLogin}`,
      },
      reactionGroups: [],
    },

    switchToIssueish: () => {},

    ...overrides,
  };
}
