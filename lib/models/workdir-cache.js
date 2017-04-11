import path from 'path';
import fs from 'fs';

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

  resolvePath(unresolvedPath) {
    return new Promise((resolve, reject) => {
      fs.realpath(unresolvedPath, (err, resolved) => (err ? reject(err) : resolve(resolved)));
    });
  }

  walkToRoot(initialDir) {
    return new Promise((resolve, reject) => {
      let currentDir = initialDir;

      const check = () => {
        const dotGit = path.join(currentDir, '.git');
        fs.stat(dotGit, (statError, stat) => {
          if (statError) {
            if (statError.code === 'ENOENT' || statError.code === 'ENOTDIR') {
              // File not found. This is not the directory we're looking for. Continue walking.
              return walk();
            }

            return reject(statError);
          }

          if (!stat.isDirectory()) {
            // A file called ".git". Probably not a good idea, but still not a git working directory.
            return walk();
          }

          // .git directory found! Mission accomplished.
          return resolve(currentDir);
        });
      };

      const walk = () => {
        const parentDir = path.resolve(currentDir, '..');
        if (parentDir === currentDir) {
          // Root directory. Traversal done, no working directory found.
          resolve(null);
        }

        currentDir = parentDir;
        check();
      };

      check();
    });
  }
}
