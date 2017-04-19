import path from 'path';

import {remote, ipcRenderer as ipc} from 'electron';
const {BrowserWindow} = remote;

import {autobind} from 'core-decorators';

import {getPackageRoot} from './helpers';

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
    this.renderer = null;
    ipc.on('git-data', this.onGitDataReceived);
    this.createNewRenderer();
  }

  @autobind
  onGitDataReceived(event, data) {
    const resolve = this.resolveByOperationId.get(data.operationId);
    resolve(data);
  }

  request(data) {
    return new Promise(resolve => {
      this.resolveByOperationId.set(++this.operationId, resolve);
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
    this.resolveByOperationId = new Map();
    ipc.removeListener('git-data', this.onGitDataReceived);
  }
}

class RendererProcess {
  constructor(hostWebContentsId) {
    this.hostWebContentsId = hostWebContentsId;
    ipc.on('renderer-ready', this.onRendererReady);
    this.win = new BrowserWindow({show: !!process.env.ATOM_GITHUB_SHOW_RENDERER_WINDOW});
    this.win.webContents.openDevTools();
    const htmlPath = path.join(getPackageRoot(), 'lib', 'renderer.html');
    const rendererJsPath = path.join(getPackageRoot(), 'lib', 'renderer.js');
    this.win.loadURL(`file://${htmlPath}?js=${rendererJsPath}&hostWebContentsId=${this.hostWebContentsId}`);
    this.readyPromise = new Promise(resolve => { this.resolveReady = resolve; });
  }

  @autobind
  onRendererReady(event, {webContentsId}) {
    if (webContentsId === this.win.webContents.id) {
      this.resolveReady();
    }
  }

  send(data) {
    this.win.webContents.send('request-git-exec', this.hostWebContentsId, data);
  }

  getReadyPromise() {
    return this.readyPromise;
  }

  destroy() {
    // after last response is received, shut down
    ipc.removeListener('renderer-ready', this.onRendererReady);
    this.win.destroy();
  }
}
