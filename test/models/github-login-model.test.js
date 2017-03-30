import GithubLoginModel, {KeytarStrategy, SecurityBinaryStrategy, UNAUTHENTICATED} from '../../lib/models/github-login-model';

describe('GithubLoginModel', function() {
  [KeytarStrategy, SecurityBinaryStrategy].forEach(function(Strategy) {
    if (Strategy.isValid()) {
      describe(Strategy.name, function() {
        it('manages passwords', async function() {
          const loginModel = new GithubLoginModel(Strategy);
          const callback = sinon.stub();
          loginModel.onDidUpdate(callback);
          const TOKEN = 'TOKEN';

          await loginModel.setToken('test-account', TOKEN);
          assert.equal(callback.callCount, 1);
          assert.equal(await loginModel.getToken('test-account'), TOKEN);
          await loginModel.removeToken('test-account');
          assert.equal(await loginModel.getToken('test-account'), UNAUTHENTICATED);
        });
      });
    } else {
      // eslint-disable-next-line no-console
      console.warn(
        `Skipping tests for ${Strategy} as they are not supported on this platform (maybe your Atom is unsigned?)`,
      );
    }
  });
});
