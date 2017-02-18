import os from 'os';

import {firstImplementer} from './helpers';
import AsyncQueue from './async-queue';
import GitShellOutStrategy from './git-shell-out-strategy';
import NodeGitStrategy from './nodegit-strategy';

export default {
  create(workingDir, options = {}) {
    const parallelism = options.parallelism || Math.max(3, os.cpus().length);
    const commandQueue = new AsyncQueue({parallelism});
    const strategyOptions = {...options, queue: commandQueue};

    const gitShellOutStrategy = new GitShellOutStrategy(workingDir, strategyOptions);
    const nodegitStrategy = new NodeGitStrategy(workingDir, strategyOptions);
    const strategies = [nodegitStrategy, gitShellOutStrategy];
    return firstImplementer(...strategies);
  },
};
