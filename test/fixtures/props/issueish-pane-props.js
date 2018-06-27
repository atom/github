import GithubLoginModel from '../../../lib/models/github-login-model';
import {InMemoryStrategy} from '../../../lib/shared/keytar-strategy';

export function issueishPaneItemProps(overrides = {}) {
  return {
    loginModel: new GithubLoginModel(InMemoryStrategy),
    ...overrides,
  };
}
