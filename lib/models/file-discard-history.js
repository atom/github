export default class FileDiscardHistory {
  constructor(createBlob, restoreBlob) {
    this.createBlob = createBlob;
    this.restoreBlob = restoreBlob;
    this.blobHistoryByFilePath = new Map();
  }

  async storeBlobs(filePath, destructiveAction) {
    const beforeSha = await this.createBlob(filePath);
    destructiveAction();
    const afterSha = await this.createBlob(filePath);
    const snapshots = {beforeSha, afterSha};
    const history = this.blobHistoryByFilePath.get(filePath);
    if (history) {
      history.push(snapshots);
    } else {
      this.blobHistoryByFilePath.set(filePath, [snapshots]);
    }
    return snapshots;
  }

  async attemptToRestoreBlob(filePath) {
    const currentSha = await this.createBlob(filePath);
    const history = this.blobHistoryByFilePath.get(filePath);
    const {beforeSha, afterSha} = history[history.length - 1];
    if (currentSha === afterSha) {
      await this.restoreBlob(filePath, beforeSha);
      history.pop();
    } else {
      throw new Error('Cannot restore file. Contents have been modified since last discard.');
    }
  }

  hasUndoHistory(filePath) {
    const history = this.blobHistoryByFilePath.get(filePath);
    return !!history && history.length > 0;
  }
}
