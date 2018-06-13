import Remote, {nullRemote} from '../../lib/models/remote';
import Branch from '../../lib/models/branch';

import Search from '../../lib/models/search';

describe('Search', function() {
  const origin = new Remote('origin', 'git@github.com:atom/github.git');
  const originMaster = Branch.createRemoteTracking('origin/master', 'origin', 'refs/heads/master');
  const master = new Branch('master', originMaster);
  const local = new Branch('local');
  const tracksLocal = new Branch('tracks-local', local);

  describe('for the current pull request', function() {
    it('is a null search when the Branch has no upstream', function() {
      const s = Search.forCurrentPR(origin, local);
      assert.isTrue(s.isNull());
    });

    it("is a null search when the Branch's upstream is not a remote tracking branch", function() {
      const s = Search.forCurrentPR(origin, tracksLocal);
      assert.isTrue(s.isNull());
    });

    it('is a null search when no Remote is available', function() {
      const s = Search.forCurrentPR(nullRemote, master);
      assert.isTrue(s.isNull());
    });

    it('creates a templated search query for a remote and branch', function() {
      const s = Search.forCurrentPR(origin, master);
      assert.isFalse(s.isNull());
      assert.strictEqual(s.createQuery(), 'repo:atom/github type:pr head:master');
    });
  });

  describe('when scoped to a remote', function() {
    it('is a null search when the remote is not present', function() {
      const s = Search.inRemote(nullRemote, 'name', 'query');
      assert.isTrue(s.isNull());
      assert.strictEqual(s.getName(), 'name');
    });

    it('prepends a repo: criteria to the search query', function() {
      const s = Search.inRemote(origin, 'name', 'query');
      assert.isFalse(s.isNull());
      assert.strictEqual(s.getName(), 'name');
      assert.strictEqual(s.createQuery(), 'repo:atom/github query');
    });
  });
});
