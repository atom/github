import getGitHubUser from '../lib/github-user';
import GithubLoginModel from '../lib/models/github-login-model';
import {InMemoryStrategy} from '../lib/shared/keytar-strategy';
import {expectRelayQuery} from '../lib/relay-network-layer-manager';

describe('getGitHubUser', function() {
  let login;
  const gitHubUser = 'annthurium';
  function useResult() {
    return expectRelayQuery({name: 'GetGitHubUser', variables: {}}, {
      viewer: {login: gitHubUser},
    });
  }
  beforeEach(function() {
    login = new GithubLoginModel(InMemoryStrategy);
  });
  describe('sufficiently scoped tokens', function() {
    beforeEach(async function() {
      sinon.stub(login, 'getScopes').returns(Promise.resolve(GithubLoginModel.REQUIRED_SCOPES));
      await login.setToken('https://api.github.com', '1234');
    });
    it('returns the GitHub user if one exists', async function() {
      const {resolve} = useResult();
      resolve();
      const user = await getGitHubUser(login);
      await assert.async.deepEqual(user, gitHubUser);
    });
    it('handles graphql error gracefully', async function() {
      function useErrorResult() {
        return expectRelayQuery({name: 'GetGitHubUser', variables: {}}, {
          errors: ['oh', 'emgee'],
        });
      }
      const {resolve} = useErrorResult();
      resolve();
      const user = await getGitHubUser(login);
      await assert.async.isNull(user);
    });
    it('returns null if response does not contain viewer', async function() {
      function useEmptyResult() {
        return expectRelayQuery({name: 'GetGitHubUser', variables: {}}, {});
      }
      const {resolve} = useEmptyResult();
      resolve();
      const user = await getGitHubUser(login);
      await assert.async.isNull(user);
    });
  });
  it('returns null if token has insufficient scope', async function() {
    sinon.stub(login, 'getScopes').resolves(['not-enough']);
    const user = await getGitHubUser(login);
    await assert.async.isNull(user);
  });
});
