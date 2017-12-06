import fs from 'fs-extra';
import path from 'path';
import temp from 'temp';

import React from 'react';
import ReactDom from 'react-dom';
import sinon from 'sinon';

import Repository from '../lib/models/repository';
import GitShellOutStrategy from '../lib/git-shell-out-strategy';
import WorkerManager from '../lib/worker-manager';
import ContextMenuInterceptor from '../lib/context-menu-interceptor';
import getRepoPipelineManager from '../lib/get-repo-pipeline-manager';

assert.autocrlfEqual = (actual, expected, ...args) => {
  const newActual = actual.replace(/\r\n/g, '\n');
  const newExpected = expected.replace(/\r\n/g, '\n');
  return assert.equal(newActual, newExpected, ...args);
};

// cloning a repo into a folder and then copying it
// for each subsequent request to clone makes cloning
// 2-3x faster on macOS and 5-10x faster on Windows
const cachedClonedRepos = {};
function copyCachedRepo(repoName) {
  const workingDirPath = temp.mkdirSync('git-fixture-');
  fs.copySync(cachedClonedRepos[repoName], workingDirPath);
  return fs.realpathSync(workingDirPath);
}

export async function cloneRepository(repoName = 'three-files') {
  if (!cachedClonedRepos[repoName]) {
    const cachedPath = temp.mkdirSync('git-fixture-cache-');
    const git = new GitShellOutStrategy(cachedPath);
    await git.clone(path.join(__dirname, 'fixtures', `repo-${repoName}`, 'dot-git'), {noLocal: true});
    await git.exec(['config', '--local', 'core.autocrlf', 'false']);
    await git.exec(['config', '--local', 'commit.gpgsign', 'false']);
    await git.exec(['config', '--local', 'user.email', 'nope@nah.com']);
    await git.exec(['config', '--local', 'user.name', 'Someone']);
    await git.exec(['checkout', '--', '.']); // discard \r in working directory
    cachedClonedRepos[repoName] = cachedPath;
  }
  return copyCachedRepo(repoName);
}

export async function sha(directory) {
  const git = new GitShellOutStrategy(directory);
  const head = await git.getHeadCommit();
  return head.sha;
}

/*
 * Initialize an empty repository at a temporary path.
 */
export async function initRepository(repoName) {
  const workingDirPath = temp.mkdirSync('git-fixture-');
  const git = new GitShellOutStrategy(workingDirPath);
  await git.exec(['init']);
  await git.exec(['config', '--local', 'user.email', 'nope@nah.com']);
  await git.exec(['config', '--local', 'user.name', 'Someone']);
  return fs.realpathSync(workingDirPath);
}

export async function setUpLocalAndRemoteRepositories(repoName = 'multiple-commits', options = {}) {
  /* eslint-disable no-param-reassign */
  if (typeof repoName === 'object') {
    options = repoName;
    repoName = 'multiple-commits';
  }
  /* eslint-enable no-param-reassign */
  const baseRepoPath = await cloneRepository(repoName);
  const baseGit = new GitShellOutStrategy(baseRepoPath);

  // create remote bare repo with all commits
  const remoteRepoPath = temp.mkdirSync('git-remote-fixture-');
  const remoteGit = new GitShellOutStrategy(remoteRepoPath);
  await remoteGit.clone(baseRepoPath, {noLocal: true, bare: true});

  // create local repo with one fewer commit
  if (options.remoteAhead) { await baseGit.exec(['reset', 'HEAD~']); }
  const localRepoPath = temp.mkdirSync('git-local-fixture-');
  const localGit = new GitShellOutStrategy(localRepoPath);
  await localGit.clone(baseRepoPath, {noLocal: true});
  await localGit.exec(['remote', 'set-url', 'origin', remoteRepoPath]);
  await localGit.exec(['config', '--local', 'commit.gpgsign', 'false']);
  await localGit.exec(['config', '--local', 'user.email', 'nope@nah.com']);
  await localGit.exec(['config', '--local', 'user.name', 'Someone']);
  return {baseRepoPath, remoteRepoPath, localRepoPath};
}

export async function getHeadCommitOnRemote(remotePath) {
  const workingDirPath = temp.mkdirSync('git-fixture-');
  const git = new GitShellOutStrategy(workingDirPath);
  await git.clone(remotePath, {noLocal: true});
  return git.getHeadCommit();
}

export async function buildRepository(workingDirPath, options) {
  const repository = new Repository(workingDirPath, null, options);
  await repository.getLoadPromise();
  // eslint-disable-next-line jasmine/no-global-setup
  afterEach(async () => {
    const repo = await repository;
    repo && repo.destroy();
  });
  return repository;
}

export function buildRepositoryWithPipeline(workingDirPath, options) {
  const pipelineManager = getRepoPipelineManager(options);
  return buildRepository(workingDirPath, {pipelineManager});
}

export function assertDeepPropertyVals(actual, expected) {
  function extractObjectSubset(actualValue, expectedValue) {
    if (actualValue !== Object(actualValue)) { return actualValue; }

    const actualSubset = Array.isArray(actualValue) ? [] : {};
    for (const key of Object.keys(expectedValue)) {
      if (actualValue.hasOwnProperty(key)) {
        actualSubset[key] = extractObjectSubset(actualValue[key], expectedValue[key]);
      }
    }

    return actualSubset;
  }

  assert.deepEqual(extractObjectSubset(actual, expected), expected);
}

export function assertEqualSets(a, b) {
  assert.equal(a.size, b.size, 'Sets are a different size');
  a.forEach(item => assert(b.has(item), 'Sets have different elements'));
}

export function assertEqualSortedArraysByKey(arr1, arr2, key) {
  const sortFn = (a, b) => a[key] < b[key];
  assert.deepEqual(arr1.sort(sortFn), arr2.sort(sortFn));
}

let activeRenderers = [];
export function createRenderer() {
  let instance;
  let lastInstance;
  let node = document.createElement('div');
  // ref function should be reference equal over renders to avoid React
  // calling the "old" one with `null` and the "new" one with the instance
  const setTopLevelRef = c => { instance = c; };
  const renderer = {
    render(appWithoutRef) {
      lastInstance = instance;
      const app = React.cloneElement(appWithoutRef, {ref: setTopLevelRef});
      ReactDom.render(app, node);
    },

    get instance() {
      return instance;
    },

    get lastInstance() {
      return lastInstance;
    },

    get node() {
      return node;
    },

    unmount() {
      if (node) {
        lastInstance = instance;
        ReactDom.unmountComponentAtNode(node);
        node = null;
      }
    },
  };
  activeRenderers.push(renderer);
  return renderer;
}

export function isProcessAlive(pid) {
  if (typeof pid !== 'number') {
    throw new Error(`PID must be a number. Got ${pid}`);
  }
  let alive = true;
  try {
    return process.kill(pid, 0);
  } catch (e) {
    alive = false;
  }
  return alive;
}

// eslint-disable-next-line jasmine/no-global-setup
beforeEach(function() {
  global.sinon = sinon.sandbox.create();
});

// eslint-disable-next-line jasmine/no-global-setup
afterEach(function() {
  activeRenderers.forEach(r => r.unmount());
  activeRenderers = [];

  ContextMenuInterceptor.dispose();

  global.sinon.restore();
});

// eslint-disable-next-line jasmine/no-global-setup
after(() => {
  if (!process.env.ATOM_GITHUB_SHOW_RENDERER_WINDOW) {
    WorkerManager.reset(true);
  }
});
