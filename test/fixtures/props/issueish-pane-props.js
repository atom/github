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
