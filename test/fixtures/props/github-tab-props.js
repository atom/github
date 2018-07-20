import {InMemoryStrategy} from '../../../lib/shared/keytar-strategy';
import GithubLoginModel from '../../../lib/models/github-login-model';
import RefHolder from '../../../lib/models/ref-holder';

export function gitHubTabItemProps(atomEnv, repository, overrides = {}) {
  return {
    workspace: atomEnv.workspace,
    repository,
    loginModel: new GithubLoginModel(InMemoryStrategy),
    ...overrides,
  };
}

export function gitHubTabContainerProps(atomEnv, repository, overrides = {}) {
  return {
    ...gitHubTabItemProps(atomEnv, repository),
    rootHolder: new RefHolder(),
    ...overrides,
  };
}
