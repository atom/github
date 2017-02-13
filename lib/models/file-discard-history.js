import path from 'path';

import {getTempDir} from '../helpers';

export class CannotRestoreError extends Error { }

export default class FileDiscardHistory {
  constructor(createBlob, restoreBlob, mergeFile, setConfig) {
    this.createBlob = createBlob;
    this.restoreBlob = restoreBlob;
    this.mergeFile = mergeFile;
    this.setConfig = setConfig;
    this.blobHistoryByFilePath = {};
  }

  async storeBlobs(filePath, isSafe, destructiveAction) {
    const beforeSha = await this.createBlob({filePath});
    const isNotSafe = !(await isSafe());
    if (isNotSafe) { return null; }
    await destructiveAction();
    const afterSha = await this.createBlob({filePath});
    const snapshots = {beforeSha, afterSha};
    const history = this.blobHistoryByFilePath[filePath];
    if (history) {
      history.push(snapshots);
      if (history.length >= 60) { this.blobHistoryByFilePath[filePath] = history.slice(30); }
    } else {
      this.blobHistoryByFilePath[filePath] = [snapshots];
    }
    await this.serializeHistory();
    return snapshots;
  }

  async undoLastDiscardInTempFile(filePath, isSafe) {
    const history = this.blobHistoryByFilePath[filePath];
    const {beforeSha, afterSha} = history[history.length - 1];
    const windows = process.platform === 'win32';
    const prefix = windows ? os.tmpdir() : '/tmp';
    const tempFolderPath = await getTempDir(path.join(prefix, 'github-discard-history-'));
    const otherPath = await this.restoreBlob(path.join(tempFolderPath, `${filePath}-before-discard`), beforeSha);
    const basePath = await this.restoreBlob(path.join(tempFolderPath, `${filePath}-after-discard`), afterSha);
    if (isSafe()) {
      await this.mergeFile(filePath, basePath, otherPath);
      history.pop();
      await this.serializeHistory();
    } else {
      // TODO: make this agnositic to contents being modified. generally all we know is that it's not "safe"
      throw new CannotRestoreError('Cannot restore file. Contents have been modified since last discard.');
    }
  }

  hasUndoHistory(filePath) {
    const history = this.blobHistoryByFilePath[filePath];
    return !!history && history.length > 0;
  }

  async serializeHistory() {
    const historySha = await this.createBlob({stdin: JSON.stringify(this.blobHistoryByFilePath)});
    await this.setConfig('atomGithub.historySha', historySha);
  }

  updateHistory(history) {
    this.blobHistoryByFilePath = history;
  }

  async clearHistoryForPath(filePath) {
    this.blobHistoryByFilePath[filePath] = [];
    await this.serializeHistory();
  }

  getLastHistorySnapshotsForPath(filePath) {
    const history = this.blobHistoryByFilePath[filePath];
    return history[history.length - 1];
  }
}
