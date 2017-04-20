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
const childWebContentsId = remote.getCurrentWindow().webContents.id;
const channelName = `message-${childWebContentsId}`;

ipc.on(channelName, (event, {type, data}) => {
  if (type === 'git-exec') {
    const {args, workingDir, options, operationId} = data;
    const execStart = performance.now();
    GitProcess.exec(args, workingDir, options)
    .then(({stdout, stderr, exitCode}) => {
      event.sender.sendTo(hostWebContentsId, channelName, {
        type: 'git-data',
        data: {
          operationId,
          results: {stdout, stderr, exitCode},
        },
      });
    });
    const execEnd = performance.now();
    averageTracker.addValue(execEnd - execStart);

    if (averageTracker.getAverage() > 40) {
      event.sender.sentTo(hostWebContentsId, channelName, {type: 'slow-spawns', data: {childWebContentsId}});
    }
  } else {
    throw new Error(`Could not identify type ${type}`);
  }
});

ipc.sendTo(hostWebContentsId, channelName, {type: 'renderer-ready', data: {childWebContentsId}});
