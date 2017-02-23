import os from 'os';

import {firstImplementer} from './helpers';
import AsyncQueue from './async-queue';
import GitShellOutStrategy from './git-shell-out-strategy';
import NodeGitStrategy from './nodegit-strategy';

export default {
  create(workingDir, options = {}) {
    return this.withStrategies([NodeGitStrategy, GitShellOutStrategy])(workingDir, options);
  },

  withStrategies(strategies) {
    return function createForStrategies(workingDir, options = {}) {
      const parallelism = options.parallelism || Math.max(3, os.cpus().length);
      const commandQueue = new AsyncQueue({parallelism});
      const strategyOptions = {...options, queue: commandQueue};

      // const gitShellOutStrategy = new GitShellOutStrategy(workingDir, strategyOptions);
      // const nodegitStrategy = new NodeGitStrategy(workingDir, strategyOptions);
      const strategyInstances = strategies.map(Strategy => new Strategy(workingDir, strategyOptions));
      return firstImplementer(...strategyInstances);
    };
  },
};
