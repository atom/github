const qs = require('querystring');

const remote = require('electron').remote;
const ipc = require('electron').ipcRenderer;

const {GitProcess} = require('dugite');

class AverageTracker {
  constructor({limit} = {limit: 10}) {
    this.limit = limit;
    this.sum = 0;
    this.values = [];
  }

  addValue(value) {
    if (this.values.length >= this.limit) {
      const discardedValue = this.values.shift();
      this.sum -= discardedValue;
    }
    this.values.push(value);
    this.sum += value;
  }

  getAverage() {
    if (this.values.length < this.limit) { return null; }
    return this.sum / this.limit;
  }
}

const averageTracker = new AverageTracker({limit: 10});

const hostWebContentsId = parseInt(qs.parse(window.location.search.substr(1)).hostWebContentsId, 10);

ipc.on('request-git-exec', (event, webContentsId, {args, workingDir, options, operationId, timeSent}) => {
  const execStart = performance.now();
  GitProcess.exec(args, workingDir, options)
    .then(({stdout, stderr, exitCode}) => {
      event.sender.sendTo(webContentsId, 'git-data', {stdout, stderr, exitCode, operationId});
    });
  const execEnd = performance.now();
  averageTracker.addValue(execEnd - execStart);
  // console.error(averageTracker.values);
  // console.error(averageTracker.getAverage());
});

ipc.sendTo(hostWebContentsId, 'renderer-ready', {webContentsId: remote.getCurrentWindow().webContents.id});
