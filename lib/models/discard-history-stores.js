export class PartialFileDiscardHistory {
  constructor(maxHistoryLength) {
    this.blobHistoryByFilePath = {};
    this.maxHistoryLength = maxHistoryLength || 60;
  }

  getHistoryForPath(filePath) {
    return this.blobHistoryByFilePath[filePath];
  }

  setHistoryForPath(filePath, history) {
    this.blobHistoryByFilePath[filePath] = history;
  }

  getHistory() {
    return this.blobHistoryByFilePath;
  }

  setHistory(history) {
    this.blobHistoryByFilePath = history;
  }

  popHistoryForPath(filePath) {
    return this.getHistoryForPath(filePath).pop();
  }

  addHistory(filePath, snapshots) {
    const history = this.getHistoryForPath(filePath);
    if (history) {
      history.push(snapshots);
      if (history.length >= this.maxHistoryLength) {
        this.setHistoryForPath(filePath, history.slice(Math.ceil(this.maxHistoryLength / 2)));
      }
    } else {
      this.setHistoryForPath(filePath, [snapshots]);
    }
  }

  getLastSnapshotsForPath(filePath) {
    const history = this.getHistoryForPath(filePath);
    const snapshots = history[history.length - 1];
    if (!snapshots) { return null; }
    return {filePath, ...snapshots};
  }

  clearHistoryForPath(filePath) {
    this.setHistoryForPath(filePath, []);
  }
}

export class WholeFileDiscardHistory {
  constructor(maxHistoryLength) {
    this.blobHistory = [];
    this.maxHistoryLength = maxHistoryLength || 60;
  }

  getHistory() {
    return this.blobHistory;
  }

  setHistory(history) {
    this.blobHistory = history;
  }

  popHistory() {
    return this.getHistory().pop();
  }

  addHistory(snapshotsByPath) {
    const history = this.getHistory();
    if (history) {
      history.push(snapshotsByPath);
      if (history.length >= this.maxHistoryLength) {
        this.setHistory(history.slice(Math.ceil(this.maxHistoryLength / 2)));
      }
    } else {
      this.setHistory([snapshotsByPath]);
    }
  }

  getLastSnapshots() {
    const history = this.getHistory();
    const snapshotsByPath = history[history.length - 1] || {};
    return Object.keys(snapshotsByPath).map(p => {
      return {filePath: p, ...snapshotsByPath[p]};
    });
  }

  clearHistory() {
    this.setHistory([]);
  }
}
