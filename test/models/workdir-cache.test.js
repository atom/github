import path from 'path';
import temp from 'temp';

import {cloneRepository} from '../helpers';

import WorkdirCache from '../../lib/models/workdir-cache';

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
