import path from 'path';

import CompositeGitStrategy from '../composite-git-strategy';
import {fsStat} from '../helpers';

/**
 * Locate the nearest git working directory above a given starting point, caching results.
 */
export default class WorkdirCache {
  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
    this.known = new Map();
  }

  async find(startPath) {
    const cached = this.known.get(startPath);
    if (cached !== undefined) {
      return cached;
    }

    const workDir = await this.revParse(startPath);

    if (this.known.size >= this.maxSize) {
      this.known.clear();
    }
    this.known.set(startPath, workDir);

    return workDir;
  }

  invalidate() {
    this.known.clear();
  }

  async revParse(startPath) {
    try {
      const startDir = (await fsStat(startPath)).isDirectory() ? startPath : path.dirname(startPath);
      const workDir = await CompositeGitStrategy.create(startDir).exec(['rev-parse', '--show-toplevel']);
      return workDir.trim();
    } catch (e) {
      return null;
    }
  }
}
