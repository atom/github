import {cloneRepository} from '../helpers';

import Repository from '../../lib/models/repository';
import WorkdirContextPool from '../../lib/models/workdir-context-pool';

describe('WorkdirContextPool', function() {
  let atomEnv, workspace, pool;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
    workspace = atomEnv.workspace;

    pool = new WorkdirContextPool({
      window, workspace,
    });
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  describe('add', function() {
    let workingDirectory;

    beforeEach(async function() {
      workingDirectory = await cloneRepository('three-files');
    });

    it('adds a WorkdirContext for a new working directory', function() {
      assert.equal(pool.size(), 0);
      assert.isUndefined(pool.getContext(workingDirectory));

      pool.add(workingDirectory);

      assert.equal(pool.size(), 1);
      assert.isDefined(pool.getContext(workingDirectory));
    });

    it('optionally provides a preinitialized repository', async function() {
      const existingRepo = await Repository.open(workingDirectory);

      pool.add(workingDirectory, {repository: existingRepo});

      const addedRepo = pool.getContext(workingDirectory).getRepository();
      assert.strictEqual(addedRepo, existingRepo);
    });

    it('is a no-op if the working directory already has a context', function() {
      pool.add(workingDirectory);
      assert.equal(pool.size(), 1);

      const context = pool.getContext(workingDirectory);
      assert.isDefined(context);

      pool.add(workingDirectory);
      assert.equal(pool.size(), 1);
    });

    it('begins but does not await the asynchronous initialization process', async function() {
      pool.add(workingDirectory);
      const context = pool.getContext(workingDirectory);
      assert.isNull(context.getRepository());

      const repo = await context.getRepositoryPromise();
      assert.isNotNull(repo);
    });
  });

  describe('remove', function() {
    let existingDirectory, existingContext;

    beforeEach(async function() {
      existingDirectory = await cloneRepository('three-files');
      pool.add(existingDirectory);

      existingContext = pool.getContext(existingDirectory);
    });

    it('removes a WorkdirContext for an existing working directory', function() {
      assert.equal(pool.size(), 1);
      pool.remove(existingDirectory);
      assert.isUndefined(pool.getContext(existingDirectory));
      assert.equal(pool.size(), 0);
    });

    it('is a no-op if the working directory is not present', function() {
      assert.equal(pool.size(), 1);
      pool.remove('/nope');
      assert.equal(pool.size(), 1);
    });

    it('begins but does not await the termination process', async function() {
      const repo = await existingContext.getRepositoryPromise();
      sinon.spy(repo, 'destroy');

      assert.isFalse(existingContext.isDestroyed());
      pool.remove(existingDirectory);
      assert.isTrue(existingContext.isDestroyed());
      assert.isTrue(repo.destroy.called);
    });
  });

  describe('set', function() {
    let dir0, dir1, dir2;

    beforeEach(async function() {
      [dir0, dir1, dir2] = await Promise.all([
        cloneRepository('three-files'),
        cloneRepository('three-files'),
        cloneRepository('three-files'),
      ]);

      pool.add(dir0);
      pool.add(dir1);
    });

    it('adds new directories, removes missing ones, and maintains kept ones', function() {
      const context0 = pool.getContext(dir0);
      const context1 = pool.getContext(dir1);

      pool.set([dir1, dir2]);

      assert.equal(pool.size(), 2);

      assert.isTrue(context0.isDestroyed());
      assert.isFalse(context1.isDestroyed());
      assert.isDefined(pool.getContext(dir2));
    });
  });
});
