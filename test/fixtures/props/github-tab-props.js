import {InMemoryStrategy} from '../../../lib/shared/keytar-strategy';
import GithubLoginModel from '../../../lib/models/github-login-model';

export function gitHubTabItemProps(atomEnv, repository, overrides = {}) {
  return {
    workspace: atomEnv.workspace,
    repository,
    loginModel: new GithubLoginModel(InMemoryStrategy),
    ...overrides,
  };
}
