const qs = require('querystring');

const remote = require('electron').remote;
const ipc = require('electron').ipcRenderer;

const {GitProcess} = require('dugite');

/*
dynamically change limit for AverageTracker
Limit starts at 10
When creating new renderer:
  If previousCommandCount == previousLimit
    newLimit = Math.min(oldLimit * 1.5)
  else
    newLimit = 10

if average spawn time > 20 ms, create new renderer and send # of operations
*/

class AverageTracker {
  constructor({limit} = {limit: 10}) {
    console.log('new tracker, with limit', limit);
    this.limit = limit;
    this.count = 0;
    this.sum = 0;
    this.values = [];
  }

  addValue(value) {
    this.count++;
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

  getCount() {
    return this.count;
  }

  getLimit() {
    return this.limit;
  }
}

const hostWebContentsId = parseInt(qs.parse(window.location.search.substr(1)).hostWebContentsId, 10);
const limit = parseInt(qs.parse(window.location.search.substr(1)).limit, 10);
const childWebContentsId = remote.getCurrentWindow().webContents.id;
const channelName = `message-${childWebContentsId}`;

const averageTracker = new AverageTracker({limit});

ipc.on(channelName, (event, {type, data}) => {
  if (type === 'git-exec') {
    console.log('.');
    const {args, workingDir, options, operationId} = data;
    const execStart = performance.now();
    GitProcess.exec(args, workingDir, options)
    .then(({stdout, stderr, exitCode}) => {
      event.sender.sendTo(hostWebContentsId, channelName, {
        type: 'git-data',
        data: {
          operationId,
          average: averageTracker.getAverage(),
          results: {stdout, stderr, exitCode},
        },
      });
    });
    const execEnd = performance.now();
    averageTracker.addValue(execEnd - execStart);

    const average = averageTracker.getAverage();
    if (average && average > 20) {
      console.log('ABOUT TO DIE');
      event.sender.sendTo(hostWebContentsId, channelName, {type: 'slow-spawns', data: {
        operationCount: averageTracker.getCount(),
        limit: averageTracker.getLimit(),
      }});
    }
  } else {
    throw new Error(`Could not identify type ${type}`);
  }
});

ipc.sendTo(hostWebContentsId, channelName, {type: 'renderer-ready'});
