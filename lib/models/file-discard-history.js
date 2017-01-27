export default class FileDiscardHistory {
  constructor(createBlob, restoreBlob) {
    this.createBlob = createBlob;
    this.restoreBlob = restoreBlob;
    this.blobHistoryByFilePath = new Map();
  }

  async storeBlobs(filePath, isSafe, destructiveAction) {
    const beforeSha = await this.createBlob(filePath);
    const isNotSafe = !(await isSafe());
    if (isNotSafe) { return; }
    destructiveAction();
    const afterSha = await this.createBlob(filePath);
    const snapshots = {beforeSha, afterSha};
    const history = this.blobHistoryByFilePath.get(filePath);
    if (history) {
      history.push(snapshots);
    } else {
      this.blobHistoryByFilePath.set(filePath, [snapshots]);
    }
  }

  async attemptToRestoreBlob(filePath, isSafe) {
    const history = this.blobHistoryByFilePath.get(filePath);
    const {beforeSha, afterSha} = history[history.length - 1];
    const currentSha = await this.createBlob(filePath);
    if (currentSha === afterSha && isSafe()) {
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
