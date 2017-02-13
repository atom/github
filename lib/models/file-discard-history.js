import path from 'path';
import os from 'os';

import {getTempDir} from '../helpers';

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
    const resultPath = path.join(tempFolderPath, `${filePath}-merge-result`);
    return isSafe() ? await this.mergeFile(filePath, basePath, otherPath, resultPath) : null;
  }

  async popUndoHistoryForFilePath(filePath) {
    this.blobHistoryByFilePath[filePath].pop();
    await this.serializeHistory();
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

  getUndoHistoryForPath(filePath) {
    return this.blobHistoryByFilePath[filePath];
  }
}
