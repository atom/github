import {remote, ipcRenderer as ipc} from 'electron';
const {BrowserWindow} = remote;

import {autobind} from 'core-decorators';

import {GitError} from './git-shell-out-strategy';

export default class RendererProcessManager {
  static instance = null;

  static getInstance() {
    if (!this.instance) {
      this.instance = new RendererProcessManager();
    }
    return this.instance;
  }

  static reset() {
    if (this.instance) { this.instance.destroy(); }
    this.instance = null;
  }

  constructor() {
    this.resolveByOperationId = new Map();
    this.operationId = 0;
    this.webContentsId = remote.getCurrentWebContents().id;
    global.requestCounter = 0;
    this.renderer = null;
    this.createNewRenderer();

    ipc.on('git-data', this.onGitDataReceived);
  }

  @autobind
  onGitDataReceived(event, {type, data}) {
    // console.log('operationId', data.operationId);
    if (type === 'git') {
      // console.debug('>>', data.operationId);
      const resolve = this.resolveByOperationId.get(data.operationId);
      global.requestCounter--;
      console.log('--requestCounter', global.requestCounter);
      resolve(data);
      // if (data.err) {
      //   console.warn(data.err);
      //   const error = new GitError(data.err.message);
      //   Object.assign(error, data.err);
      //   resolve(Promise.reject(error)); // TODO: check this
      // } else {
      //   resolve(data.result);
      // }
      // const execTime = data.execTime;
      // const totalTime = performance.now() - data.timeSent;
      // console.debug(`git data for ${data.formattedArgs}`, data);
      // console.debug('times (total, exec, ipc)', Math.round(totalTime), Math.round(execTime), Math.round(totalTime - execTime));
    } else {
      console.log('unrecognized type');
    }
  }

  async request(data) {
    return new Promise(resolve => {
      console.log('++requestCounter', ++global.requestCounter);
      this.resolveByOperationId.set(++this.operationId, resolve);
      // console.debug('<<', this.operationId);
      this.renderer.send({...data, operationId: this.operationId});
    });
  }

  createNewRenderer() {
    if (this.renderer) { this.renderer.destroy(); }
    this.renderer = new RendererProcess(this.webContentsId);
  }

  isReady() {
    return this.renderer && this.renderer.isReady();
  }

  getReadyPromise() {
    return this.renderer && this.renderer.getReadyPromise();
  }

  destroy() {
    if (this.renderer) { this.renderer.destroy(); }
    this.renderer = null;
    global.requestCounter = 0;
    this.resolveByOperationId = new Map();
    ipc.removeListener('git-data', this.onGitDataReceived);
  }
}

class RendererProcess {
  constructor(webContentsId) {
    console.log('create renderer process');
    this.webContentsId = webContentsId;
    this.win = new BrowserWindow({show: false});
    this.win.webContents.openDevTools();
    this.win.loadURL('file:///Users/kuychaco/github/github/lib/renderer.html');
    this.ready = false;
    this.readyPromise = new Promise(resolve => {
      this.win.webContents.once('dom-ready', () => {
        this.ready = true;
        resolve();
      });
    });
  }

  send(data) {
    console.log('send data');
    this.win.webContents.send('ping', this.webContentsId, data);
  }

  isReady() {
    return this.ready;
  }

  getReadyPromise() {
    return this.readyPromise;
  }

  destroy() {
    // after last response is received, shut down
    this.win.destroy();
  }
}
