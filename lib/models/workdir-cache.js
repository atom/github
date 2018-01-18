import path from 'path';
import fs from 'fs';
import realpath from 'realpath-native';

import {readFile, isValidWorkdir} from '../helpers';

/**
 * Locate the nearest git working directory above a given starting point, caching results.
 */
export default class WorkdirCache {
  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
    this.known = new Map();
  }

  async find(startDir) {
    console.log(`> START: find ${startDir}`);
    try {
      console.log('resolving startDir');
      const resolvedDir = await this.resolvePath(startDir);
      console.log('checking cached');
      const cached = this.known.get(resolvedDir);
      if (cached !== undefined) {
        console.log('RETURNING cached', cached);
        return cached;
      }

      console.log('walking to root');
      const workDir = await this.walkToRoot(resolvedDir);

      console.log('clearing known if it is too large..');
      if (this.known.size >= this.maxSize) {
        console.log('IT IS! clearing');
        this.known.clear();
      }
      console.log('setting', resolvedDir, workDir);
      this.known.set(resolvedDir, workDir);
      console.log('RETURNING', workDir);
      return workDir;
    } catch (e) {
      console.log('OMG GOT AN ERROR');
      console.log(e);
      if (e.code === 'ENOENT') {
        console.log('ENOENT, returning null');
        return null;
      }

      throw e;
    }
  }

  async invalidate(baseDir) {
    const resolvedBase = await this.resolvePath(baseDir);
    for (const cachedPath of this.known.keys()) {
      if (cachedPath.startsWith(resolvedBase)) {
        this.known.delete(cachedPath);
      }
    }
  }

  resolvePath(unresolvedPath) {
    console.log('in resolvePath', unresolvedPath);
    return new Promise((resolve, reject) => {
      console.log('in promise callback, calling realpath');
      realpath(unresolvedPath, (err, resolved) => {
        console.log('realpath returned');
        if (err) {
          console.log('Rejecting with err');
          console.log(err);
          reject(err);
        } else {
          console.log('resolving with', resolved);
          resolve(resolved);
        }
      });
    });
  }

  walkToRoot(initialDir) {
    return new Promise((resolve, reject) => {
      let currentDir = initialDir;

      const check = () => {
        if (!isValidWorkdir(currentDir)) {
          return walk();
        }

        const dotGit = path.join(currentDir, '.git');
        fs.stat(dotGit, async (statError, stat) => {
          if (statError) {
            if (statError.code === 'ENOENT' || statError.code === 'ENOTDIR') {
              // File not found. This is not the directory we're looking for. Continue walking.
              return walk();
            }

            return reject(statError);
          }

          if (!stat.isDirectory()) {
            const contents = await readFile(dotGit, 'utf8');
            if (contents.startsWith('gitdir: ')) {
              return resolve(currentDir);
            } else {
              return walk();
            }
          }

          // .git directory found! Mission accomplished.
          return resolve(currentDir);
        });
        return null;
      };

      const walk = () => {
        const parentDir = path.resolve(currentDir, '..');
        if (parentDir === currentDir) {
          // Root directory. Traversal done, no working directory found.
          resolve(null);
          return;
        }

        currentDir = parentDir;
        check();
      };

      check();
    });
  }
}
