import path from 'path';
import fs from 'fs';

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
    try {
      const resolvedDir = await this.resolvePath(startDir);
      const cached = this.known.get(resolvedDir);
      if (cached !== undefined) {
        return cached;
      }

      const workDir = await this.walkToRoot(resolvedDir);

      if (this.known.size >= this.maxSize) {
        this.known.clear();
      }
      this.known.set(resolvedDir, workDir);
      return workDir;
    } catch (e) {
      if (e.code === 'ENOENT') {
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
    return new Promise((resolve, reject) => {
      fs.realpath(unresolvedPath, (err, resolved) => (err ? reject(err) : resolve(resolved)));
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
