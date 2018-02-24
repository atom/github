import path from 'path';

import CompositeGitStrategy from '../composite-git-strategy';
import {fsStat, toNativePathSep} from '../helpers';

/**
 * Locate the nearest git working directory above a given starting point, caching results.
 */
export default class WorkdirCache {
  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
    this.known = new Map();
  }

  /* eslint-disable no-console */
  async find(startPath) {
    console.log(`WorkdirCache.find('${startPath}')`);
    console.log(`... cache =\n   ${Array.from(this.known, each => each[0] + ' => ' + each[1]).join('\n   ')}`);

    const cached = this.known.get(startPath);
    if (cached !== undefined) {
      console.log(`... cache hit: '${cached}'`);
      return cached;
    }

    console.log('... cache miss, about to revparse');
    const workDir = await this.revParse(startPath);
    console.log(`... workdir = '${workDir}'`);

    console.log(`... cache size: ${this.known.size}`);
    if (this.known.size >= this.maxSize) {
      console.log('... clearing cache');
      this.known.clear();
    }
    this.known.set(startPath, workDir);

    console.log(`... returning workdir = ${workDir}`);
    return workDir;
  }
  /* eslint-enable no-console */

  invalidate() {
    this.known.clear();
  }

  async revParse(startPath) {
    try {
      const startDir = (await fsStat(startPath)).isDirectory() ? startPath : path.dirname(startPath);
      const workDir = await CompositeGitStrategy.create(startDir).exec(['rev-parse', '--show-toplevel']);
      return toNativePathSep(workDir.trim());
    } catch (e) {
      return null;
    }
  }
}
