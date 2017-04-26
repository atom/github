const qs = require('querystring');

const {remote, ipcRenderer: ipc} = require('electron');
const {GitProcess} = require('dugite');


class AverageTracker {
  constructor({limit} = {limit: 10}) {
    // for now this serves a dual purpose - # of values tracked AND # discarded prior to starting avg calculation
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
    if (this.enoughData()) {
      return this.sum / this.limit;
    } else {
      return null;
    }
  }

  getLimit() {
    return this.limit;
  }

  enoughData() {
    return this.values.length === this.limit;
  }
}

const query = qs.parse(window.location.search.substr(1));
const sourceWebContentsId = remote.getCurrentWindow().webContents.id;
const operationCountLimit = parseInt(query.operationCountLimit, 10);
const averageTracker = new AverageTracker({limit: operationCountLimit});

const destroyRenderer = () => { remote.BrowserWindow.fromWebContents(remote.getCurrentWebContents()).destroy(); };
const managerWebContentsId = parseInt(query.managerWebContentsId, 10);
const managerWebContents = remote.webContents.fromId(managerWebContentsId);
managerWebContents.on('crashed', () => { destroyRenderer(); });
managerWebContents.on('destroyed', () => { destroyRenderer(); });

const channelName = query.channelName;
ipc.on(channelName, (event, {type, data}) => {
  if (type === 'git-exec') {
    const {args, workingDir, options, id} = data;
    if (args) {
      document.getElementById('command').textContent = `git ${args.join(' ')}`;
    }
    const spawnStart = performance.now();
    GitProcess.exec(args, workingDir, options)
    .then(({stdout, stderr, exitCode}) => {
      const timing = {
        spawnTime: spawnEnd - spawnStart,
        execTime: performance.now() - spawnEnd,
      };
      event.sender.sendTo(managerWebContentsId, channelName, {
        sourceWebContentsId,
        type: 'git-data',
        data: {
          id,
          average: averageTracker.getAverage(),
          results: {stdout, stderr, exitCode, timing},
        },
      });
    });
    const spawnEnd = performance.now();
    averageTracker.addValue(spawnEnd - spawnStart);
    event.sender.sendTo(managerWebContentsId, channelName, {sourceWebContentsId, type: 'exec-started', data: {id}});

    if (averageTracker.enoughData() && averageTracker.getAverage() > 20) {
      event.sender.sendTo(managerWebContentsId, channelName, {type: 'slow-spawns'});
    }
  } else {
    throw new Error(`Could not identify type ${type}`);
  }
});

ipc.sendTo(managerWebContentsId, channelName, {sourceWebContentsId, type: 'renderer-ready', data: {pid: process.pid}});
