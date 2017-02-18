import os from 'os';

import Git from 'nodegit';

import AsyncQueue from './async-queue';
import {writeFile} from './helpers';
import GitTimingsView from './views/git-timings-view';

export default class NodeGitStrategy {
  constructor(workingDir, options = {}) {
    this.workingDir = workingDir;
    this.nodegit = Git.Repository.open(workingDir);
    if (options.queue) {
      this.commandQueue = options.queue;
    } else {
      const parallelism = options.parallelism || Math.max(3, os.cpus().length);
      this.commandQueue = new AsyncQueue({parallelism});
    }
  }

  async execNodeGit(op, label = '<unknown>') {
    const timingMarker = GitTimingsView.generateMarker(label + ' (nodegit)');
    timingMarker.mark('queued');
    timingMarker.mark('prepare');
    timingMarker.mark('nexttick');
    timingMarker.mark('execute');
    const retVal = await op();
    timingMarker.finalize();
    return retVal;
  }

  getStatusesForChangedFiles() {
    return this.execNodeGit(async () => {
      const stagedFiles = {};
      const unstagedFiles = {};
      const mergeConflictFiles = {};
      const repo = await this.nodegit;
      const statuses = await repo.getStatus();
      const STATUS = Git.Status.STATUS;
      const index = await repo.index();

      /* eslint-disable no-bitwise */
      for (let i = 0; i < statuses.length; i++) {
        const status = statuses[i];
        const mask = status.statusBit();
        const filePath = status.path();
        if (mask & STATUS.INDEX_NEW) {
          stagedFiles[filePath] = 'added';
        }
        if (mask & STATUS.INDEX_MODIFIED || mask & STATUS.INDEX_TYPECHANGE) {
          stagedFiles[filePath] = 'modified';
        }
        if (mask & STATUS.INDEX_DELETED) {
          stagedFiles[filePath] = 'deleted';
        }
        if (mask & STATUS.INDEX_RENAMED) {
          // eslint-disable-next-line no-console
          console.warn('rename detected, check if handled correctly for staged filePath', filePath);
        }
        if (mask & STATUS.WT_NEW) {
          unstagedFiles[filePath] = 'added';
        }
        if (mask & STATUS.WT_MODIFIED || mask & STATUS.WT_TYPECHANGE) {
          unstagedFiles[filePath] = 'modified';
        }
        if (mask & STATUS.WT_DELETED) {
          unstagedFiles[filePath] = 'deleted';
        }
        if (mask & STATUS.WT_RENAMED) {
          // eslint-disable-next-line no-console
          console.warn('rename detected, check if handled correctly for unstaged filePath', filePath);
        }
        if (mask & STATUS.CONFLICTED) {
          // eslint-disable-next-line babel/no-await-in-loop
          const {ancestor_out: base, our_out: ours, their_out: theirs} = await index.conflictGet(filePath);
          if (!base && ours && theirs) {
            mergeConflictFiles[filePath] = {ours: 'added', theirs: 'added', file: 'modified'};
          } else if (base && ours && theirs) {
            mergeConflictFiles[filePath] = {ours: 'modified', theirs: 'modified', file: 'modified'};
          } else if (base && ours && !theirs) {
            mergeConflictFiles[filePath] = {ours: 'modified', theirs: 'deleted', file: 'equivalent'};
          } else if (base && !ours && theirs) {
            mergeConflictFiles[filePath] = {ours: 'deleted', theirs: 'modified', file: 'added'};
          } else {
            // eslint-disable-next-line no-console
            console.error('Unrecognized index state:', {base, ours, theirs});
          }
        }
      }
      /* eslint-enable no-bitwise */
      return {stagedFiles, unstagedFiles, mergeConflictFiles};
    }, 'getStatusesForChangedFiles');
  }

  /**
   * Miscellaneous getters
   */
  getCommit(ref) {
    return this.execNodeGit(async () => {
      const commit = await this._getCommitFromRevspec(ref);
      return {sha: commit.id().toString(), message: commit.message().trim()};
    }, 'getCommit');
  }

  getHeadCommit() {
    return this.getCommit('HEAD');
  }

  async getRemoteForBranch(branchName) {
    try {
      // const output = await this.exec(['config', `branch.${branchName}.remote`]);
      return await this.getConfig(`branch.${branchName}.remote`);
    } catch (e) {
      return null;
    }
  }

  async push(branchName, options = {}) {
    const remote = await this.getRemoteForBranch(branchName);
    const args = ['push', remote || 'origin', branchName];
    if (options.setUpstream) { args.push('--set-upstream'); }
    if (options.force) { args.push('--force'); }
    return this.exec(args, {useGitPromptServer: true, writeOperation: true});
  }

  getCurrentBranch() {
    return this.execNodeGit(async () => {
      const repo = await this.nodegit;
      const ref = await repo.head();
      return ref.shorthand();
    }, 'getCurrentBranch');
  }

  getBranches() {
    return this.execNodeGit(async () => {
      const repo = await this.nodegit;
      const refs = await Git.Reference.list(repo);
      return refs
        .filter(ref => ref.startsWith('refs/heads/'))
        .map(ref => ref.substr(11));
    }, 'getBranches');
  }

  getConfig(option, {local} = {}) {
    // TODO: non-local???
    return this.execNodeGit(async () => {
      const repo = await this.nodegit;
      const config = await repo.configSnapshot();
      try {
        return await config.getStringBuf(option);
      } catch (_e) {
        return null;
      }
    }, 'getConfig');
  }

  async getRemotes() {
    const repo = await this.nodegit;
    const remoteNames = await repo.getRemotes();
    const remotes = await Promise.all(remoteNames.map(remoteName => {
      return Git.Remote.lookup(repo, remoteName);
    }));
    return remotes.map(remote => ({
      name: remote.name(),
      url: remote.url(),
    }));
  }

  async expandBlobToFile(absFilePath, sha) {
    const output = await this.getBlobContents(sha);
    await writeFile(absFilePath, output);
    return absFilePath;
  }

  getBlobContents(sha) {
    return this.execNodeGit(async () => {
      const repo = await this.nodegit;
      const oid = Git.Oid.fromString(sha);
      const blob = await Git.Blob.lookup(repo, oid);
      return blob.toString();
    }, 'getBlobContents');
  }

  async _getOidFromRevspec(revspec) {
    const repo = await this.nodegit;
    // `revspec` might be a refspec with suffixes, etc.
    // so we use `fromRevspec` to get an annotated commit,
    // and from that the actual commit.
    const annotatedCommit = await Git.AnnotatedCommit.fromRevspec(repo, revspec);
    const oid = annotatedCommit.id();
    annotatedCommit.free();
    return oid;
  }

  async _getCommitFromRevspec(revspec) {
    const repo = await this.nodegit;
    const oid = await this._getOidFromRevspec(revspec);
    return Git.Commit.lookup(repo, oid);
  }
}
