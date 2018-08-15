import getGitHubUser from '../lib/github-user';
import GithubLoginModel from '../lib/models/github-login-model';
import {InMemoryStrategy} from '../lib/shared/keytar-strategy';
import {expectRelayQuery} from '../lib/relay-network-layer-manager';

describe.only('getGitHubUser', function() {
  let login;
  const gitHubUser = 'annthurium';
  function useResult() {
    return expectRelayQuery({name: 'GetGitHubUser'}, {
      viewer: {login: gitHubUser}
    });
  }
  beforeEach(function() {
    login = new GithubLoginModel(InMemoryStrategy);
    sinon.stub(login, 'getScopes').returns(Promise.resolve(GithubLoginModel.REQUIRED_SCOPES));
  })
  it('returns the GitHub user if one exists', async function() {
    await login.setToken('https://api.github.com', '1234');
    useResult();
    const user = await getGitHubUser();
    assert.deepEqual(user, gitHubUser);
  });
  // it('returns null if token has insufficient scope', function() {
  //
  // });
  // it('handles errors gracefully', function() {
  //
  // });
  // it('returns null if response does not contain viewer', function() {
  //
  // });


});
