import {cloneRepository} from '../helpers';

import Repository from '../../lib/models/repository';
import WorkdirContextPool from '../../lib/models/workdir-context-pool';

describe('WorkdirContextPool', function() {
  let pool;
  let mockWindow, mockWorkspace, mockResolutionProgressState;

  beforeEach(function() {
    mockWindow = {
      addEventListener: sinon.spy(),
      removeEventListener: sinon.spy(),
    };

    mockWorkspace = {
      observeTextEditors: sinon.spy(),
    };

    mockResolutionProgressState = {};

    pool = new WorkdirContextPool({
      window: mockWindow,
      workspace: mockWorkspace,
      resolutionProgressByPath: mockResolutionProgressState,
    });
  });

  describe('add', function() {
    let workingDirectory;

    beforeEach(async function() {
      workingDirectory = await cloneRepository('three-files');
    });

    it('adds a WorkdirContext for a new working directory', function() {
      assert.equal(pool.size(), 0);
      assert.isFalse(pool.getContext(workingDirectory).isPresent());

      pool.add(workingDirectory);

      assert.equal(pool.size(), 1);
      assert.isTrue(pool.getContext(workingDirectory).isPresent());
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
      assert.isTrue(context.isPresent());

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

    it('passes appropriate serialized state to the resolution progress', async function() {
      mockResolutionProgressState[workingDirectory] = {
        revision: '66d11860af6d28eb38349ef83de475597cb0e8b4',
        paths: {'a.txt': 12},
      };

      pool.add(workingDirectory);

      const resolutionProgress = await pool.getContext(workingDirectory).getResolutionProgressPromise();
      assert.isNotNull(resolutionProgress);
      assert.equal(resolutionProgress.getRemaining('a.txt'), 12);
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
      assert.isFalse(pool.getContext(existingDirectory).isPresent());
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

      assert.isFalse(pool.getContext(dir0).isPresent());
      assert.isTrue(pool.getContext(dir1).isPresent());
      assert.isTrue(pool.getContext(dir2).isPresent());

      assert.isTrue(context0.isDestroyed());
      assert.isFalse(context1.isDestroyed());
    });

    it('passes appropriate serialized state to any created resolution progresses');
  });

  describe('getContext', function() {
    let dir;

    beforeEach(async function() {
      dir = await cloneRepository('three-files');
      pool.add(dir);
    });

    it('returns a context by directory', async function() {
      const context = pool.getContext(dir);
      assert.isTrue(context.isPresent());

      const repo = await context.getRepositoryPromise();
      assert.strictEqual(dir, repo.getWorkingDirectoryPath());
    });

    it('returns a null context when missing', function() {
      const context = pool.getContext('/nope');
      assert.isFalse(context.isPresent());
    });
  });

  describe('clear', function() {
    it('removes all resident contexts', async function() {
      const [dir0, dir1, dir2] = await Promise.all([
        cloneRepository('three-files'),
        cloneRepository('three-files'),
        cloneRepository('three-files'),
      ]);

      pool.add(dir0);
      pool.add(dir1);
      pool.add(dir2);

      assert.equal(pool.size(), 3);

      pool.clear();

      assert.equal(pool.size(), 0);
      assert.isFalse(pool.getContext(dir0).isPresent());
      assert.isFalse(pool.getContext(dir1).isPresent());
      assert.isFalse(pool.getContext(dir2).isPresent());
    });
  });
});
