import path from 'path';
import os from 'os';

import {PartialFileDiscardHistory, WholeFileDiscardHistory} from './discard-history-stores';

import {getTempDir, copyFile} from '../helpers';

export default class DiscardHistory {
  constructor(createBlob, expandBlobToFile, mergeFile, workdirPath, {maxHistoryLength} = {}) {
    this.createBlob = createBlob;
    this.expandBlobToFile = expandBlobToFile;
    this.mergeFile = mergeFile;
    this.workdirPath = workdirPath;
    this.partialFileHistory = new PartialFileDiscardHistory(maxHistoryLength);
    this.wholeFileHistory = new WholeFileDiscardHistory(maxHistoryLength);
  }

  getLastSnapshots(partialDiscardFilePath = null) {
    if (partialDiscardFilePath) {
      return this.partialFileHistory.getLastSnapshotsForPath(partialDiscardFilePath);
    } else {
      return this.wholeFileHistory.getLastSnapshots();
    }
  }

  getHistory(partialDiscardFilePath = null) {
    if (partialDiscardFilePath) {
      return this.partialFileHistory.getHistoryForPath(partialDiscardFilePath);
    } else {
      return this.wholeFileHistory.getHistory();
    }
  }

  hasHistory(partialDiscardFilePath = null) {
    const history = this.getHistory(partialDiscardFilePath);
    return history.length > 0;
  }

  popHistory(partialDiscardFilePath = null) {
    if (partialDiscardFilePath) {
      return this.partialFileHistory.popHistoryForPath(partialDiscardFilePath);
    } else {
      return this.wholeFileHistory.popHistory();
    }
  }

  clearHistory(partialDiscardFilePath = null) {
    if (partialDiscardFilePath) {
      this.partialFileHistory.clearHistoryForPath(partialDiscardFilePath);
    } else {
      this.wholeFileHistory.clearHistory();
    }
  }

  updateHistory(history) {
    this.partialFileHistory.setHistory(history.partialFileHistory || {});
    this.wholeFileHistory.setHistory(history.wholeFileHistory || []);
  }

  async createHistoryBlob() {
    const histories = {
      wholeFileHistory: this.wholeFileHistory.getHistory(),
      partialFileHistory: this.partialFileHistory.getHistory(),
    };
    const historySha = await this.createBlob({stdin: JSON.stringify(histories)});
    return historySha;
  }

  async storeBeforeAndAfterBlobs(filePaths, isSafe, destructiveAction, partialDiscardFilePath = null) {
    if (partialDiscardFilePath) {
      return await this.storeBlobsForPartialFileHistory(partialDiscardFilePath, isSafe, destructiveAction);
    } else {
      return await this.storeBlobsForWholeFileHistory(filePaths, isSafe, destructiveAction);
    }
  }

  async storeBlobsForPartialFileHistory(filePath, isSafe, destructiveAction) {
    const beforeSha = await this.createBlob({filePath});
    const isNotSafe = !(await isSafe());
    if (isNotSafe) { return null; }
    await destructiveAction();
    const afterSha = await this.createBlob({filePath});
    const snapshots = {beforeSha, afterSha};
    this.partialFileHistory.addHistory(filePath, snapshots);
    return snapshots;
  }

  async storeBlobsForWholeFileHistory(filePaths, isSafe, destructiveAction) {
    const snapshotsByPath = {};
    const beforePromises = filePaths.map(async filePath => {
      snapshotsByPath[filePath] = {beforeSha: await this.createBlob({filePath})};
    });
    await Promise.all(beforePromises);
    const isNotSafe = !(await isSafe());
    if (isNotSafe) { return null; }
    await destructiveAction();
    const afterPromises = filePaths.map(async filePath => {
      snapshotsByPath[filePath].afterSha = await this.createBlob({filePath});
    });
    await Promise.all(afterPromises);
    this.wholeFileHistory.addHistory(snapshotsByPath);
    return snapshotsByPath;
  }

  async restoreLastDiscardInTempFiles(isSafe, partialDiscardFilePath = null) {
    let lastDiscardSnapshots = this.getLastSnapshots(partialDiscardFilePath);
    if (partialDiscardFilePath) {
      lastDiscardSnapshots = lastDiscardSnapshots ? [lastDiscardSnapshots] : [];
    }
    const tempFolderPaths = await this.expandBlobsToFilesInTempFolder(lastDiscardSnapshots);
    if (!isSafe()) { return []; }
    return await this.mergeFiles(tempFolderPaths);
  }

  async expandBlobsToFilesInTempFolder(snapshots) {
    const tempFolderPath = await getTempDir(path.join(os.tmpdir(), 'github-discard-history-'));
    const pathPromises = snapshots.map(async ({filePath, beforeSha, afterSha}) => {
      const theirsPath = !beforeSha ? null :
        await this.expandBlobToFile(path.join(tempFolderPath, `${filePath}-before-discard`), beforeSha);
      const commonBasePath = !afterSha ? null :
        await this.expandBlobToFile(path.join(tempFolderPath, `${filePath}-after-discard`), afterSha);
      const resultPath = path.join(tempFolderPath, `${filePath}-merge-result`);
      return {filePath, commonBasePath, theirsPath, resultPath, theirsSha: beforeSha, commonBaseSha: afterSha};
    });
    return await Promise.all(pathPromises);
  }

  async mergeFiles(filePaths) {
    const mergeFilePromises = filePaths.map(async ({filePath, commonBasePath, theirsPath, resultPath, theirsSha, commonBaseSha}) => {
      if (theirsPath && commonBasePath) {
        const mergeResult = await this.mergeFile(filePath, commonBasePath, theirsPath, resultPath);
        return Object.assign({}, mergeResult, {theirsSha, commonBaseSha});
      } else if (!theirsPath && commonBaseSha) { // deleted file
        // TODO: handle this
        return null;
      }
      return null;
    });
    return await Promise.all(mergeFilePromises);
  }
}
