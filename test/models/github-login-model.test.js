import GithubLoginModel from '../../lib/models/github-login-model';
import {KeytarStrategy, SecurityBinaryStrategy, InMemoryStrategy, UNAUTHENTICATED} from '../../lib/shared/keytar-strategy';

describe('GithubLoginModel', function() {
  [null, KeytarStrategy, SecurityBinaryStrategy, InMemoryStrategy].forEach(function(Strategy) {
    describe((Strategy && Strategy.name) || 'default strategy', function() {
      it('manages passwords', async function() {
        if (!Strategy || await Strategy.isValid()) {
          const loginModel = new GithubLoginModel(Strategy);
          const callback = sinon.stub();
          loginModel.onDidUpdate(callback);
          const TOKEN = 'TOKEN';

          await loginModel.setToken('test-account', TOKEN);
          assert.equal(callback.callCount, 1);
          assert.equal(await loginModel.getToken('test-account'), TOKEN);
          await loginModel.removeToken('test-account');
          assert.equal(await loginModel.getToken('test-account'), UNAUTHENTICATED);
        } else {
          // eslint-disable-next-line no-console
          console.warn(`Skipping tests for ${Strategy.name} as they are not supported on this platform (or maybe your Atom is unsigned?)`);
        }
      });
    });
  });
});
