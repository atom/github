export class CannotRestoreError extends Error { }

export default class FileDiscardHistory {
  constructor(createBlob, restoreBlob, setConfig) {
    this.createBlob = createBlob;
    this.restoreBlob = restoreBlob;
    this.setConfig = setConfig;
    this.blobHistoryByFilePath = {};
  }

  async storeBlobs(filePath, isSafe, destructiveAction) {
    const beforeSha = await this.createBlob({filePath});
    const isNotSafe = !(await isSafe());
    if (isNotSafe) { return null; }
    destructiveAction();
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

  async attemptToRestoreBlob(filePath, isSafe) {
    const history = this.blobHistoryByFilePath[filePath];
    const {beforeSha, afterSha} = history[history.length - 1];
    const currentSha = await this.createBlob({filePath});
    if (currentSha === afterSha && isSafe()) {
      await this.restoreBlob(filePath, beforeSha);
      history.pop();
      await this.serializeHistory();
    } else {
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

  getHistoryForPath(filePath) {
    return this.blobHistoryByFilePath[filePath];
  }
}
