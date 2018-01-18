import path from 'path';
import temp from 'temp';
import fs from 'fs';

import {cloneRepository} from '../helpers';

import WorkdirCache from '../../lib/models/workdir-cache';
import {realPath} from '../../lib/helpers';

describe('WorkdirCache', function() {
  let cache;

  beforeEach(function() {
    cache = new WorkdirCache(5);
  });

  it('finds a workdir that is the given path', async function() {
    const sameDir = await cloneRepository('three-files');
    const workDir = await cache.find(sameDir);
    assert.equal(sameDir, workDir);
  });

  it("finds a workdir that's a parent of the given path", async function() {
    const expectedDir = await cloneRepository('three-files');
    const givenDir = path.join(expectedDir, 'subdir-1');
    const actualDir = await cache.find(givenDir);

    assert.equal(actualDir, expectedDir);
  });

  it('finds a workdir from a gitdir file', async function() {
    const repoDir = await cloneRepository('three-files');
    const expectedDir = await realPath(temp.mkdirSync());
    fs.writeFileSync(path.join(expectedDir, '.git'), `gitdir: ${path.join(repoDir, '.git')}`, 'utf8');
    const actualDir = await cache.find(expectedDir);

    assert.equal(actualDir, expectedDir);
  });

  it('returns null when a path is not in a git repository', async function() {
    const nonWorkdirPath = temp.mkdirSync();
    assert.isNull(await cache.find(nonWorkdirPath));
  });

  it('returns null when a path does not exist', async function() {
    const nope = path.join(
      __dirname,
      'does', 'not', 'exist', 'no', 'seriously', 'why', 'did', 'you', 'name', 'a', 'directory', 'this',
    );
    assert.isNull(await cache.find(nope));
  });

  it('understands a file path', async function() {
    const expectedDir = await cloneRepository('three-files');
    const givenFile = path.join(expectedDir, 'subdir-1', 'b.txt');
    const actualDir = await cache.find(givenFile);

    assert.equal(actualDir, expectedDir);
  });

  it('caches previously discovered results', async function() {
    const expectedDir = await cloneRepository('three-files');
    const givenDir = path.join(expectedDir, 'subdir-1');

    // Prime the cache
    await cache.find(givenDir);

    sinon.spy(cache, 'walkToRoot');
    const actualDir = await cache.find(givenDir);
    assert.equal(actualDir, expectedDir);
    assert.isFalse(cache.walkToRoot.called);
  });

  it('removes cached entries for all subdirectories of an entry', async function() {
    const [dir0, dir1] = await Promise.all([
      cloneRepository('three-files'),
      cloneRepository('three-files'),
    ]);

    const pathsToCheck = [
      dir0,
      path.join(dir0, 'a.txt'),
      path.join(dir0, 'subdir-1'),
      path.join(dir0, 'subdir-1', 'b.txt'),
      dir1,
    ];
    const expectedWorkdirs = [
      dir0, dir0, dir0, dir0, dir1,
    ];

    // Prime the cache
    const initial = await Promise.all(
      pathsToCheck.map(input => cache.find(input)),
    );
    assert.deepEqual(initial, expectedWorkdirs);

    // Re-lookup and hit the cache
    sinon.spy(cache, 'walkToRoot');
    const relookup = await Promise.all(
      pathsToCheck.map(input => cache.find(input)),
    );
    assert.deepEqual(relookup, expectedWorkdirs);
    assert.equal(cache.walkToRoot.callCount, 0);

    // Clear dir0
    await cache.invalidate(dir0);

    // Re-lookup and hit the cache once
    const after = await Promise.all(
      pathsToCheck.map(input => cache.find(input)),
    );
    assert.deepEqual(after, expectedWorkdirs);
    assert.isTrue(cache.walkToRoot.calledWith(dir0));
    assert.isTrue(cache.walkToRoot.calledWith(path.join(dir0, 'a.txt')));
    assert.isTrue(cache.walkToRoot.calledWith(path.join(dir0, 'subdir-1')));
    assert.isTrue(cache.walkToRoot.calledWith(path.join(dir0, 'subdir-1', 'b.txt')));
    assert.isFalse(cache.walkToRoot.calledWith(dir1));
  });

  it('clears the cache when the maximum size is exceeded', async function() {
    const dirs = await Promise.all(
      Array(6).fill(null, 0, 6).map(() => cloneRepository('three-files')),
    );

    await Promise.all(dirs.map(dir => cache.find(dir)));
    const expectedDir = dirs[1];

    sinon.spy(cache, 'walkToRoot');
    const actualDir = await cache.find(expectedDir);
    assert.equal(actualDir, expectedDir);
    assert.isTrue(cache.walkToRoot.called);
  });
});
