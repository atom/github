import path from 'path';

import {remote, ipcRenderer as ipc} from 'electron';
const {BrowserWindow} = remote;
import {Emitter} from 'event-kit';
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
    this.hostWebContentsId = remote.getCurrentWebContents().id;
    this.activeRenderer = null;
    this.renderers = new Set();
    this.createNewRenderer();
  }

  @autobind
  createNewRenderer() {
    this.activeRenderer = new RendererProcess(this.hostWebContentsId, {
      onDying: () => { this.createNewRenderer(); },
      onDestroyed: renderer => { this.renderers.delete(renderer); },
    });
    this.renderers.add(this.activeRenderer);
  }

  async request(data) {
    await this.activeRenderer.getReadyPromise();
    return this.activeRenderer.send(data);
  }

  destroy() {
    this.renderers.forEach(renderer => renderer.destroy());
  }
}

class RendererProcess {
  constructor(hostWebContentsId, {onDying, onDestroyed}) {
    this.hostWebContentsId = hostWebContentsId;
    this.onDying = onDying;
    this.onDestroyed = onDestroyed;
    this.resolveByOperationId = new Map();
    this.operationId = 0;
    this.dying = false;

    this.win = new BrowserWindow({show: !!process.env.ATOM_GITHUB_SHOW_RENDERER_WINDOW});
    this.win.webContents.openDevTools();
    this.childWebContentsId = this.win.webContents.id;
    this.channelName = `message-${this.childWebContentsId}`;

    this.emitter = new Emitter();
    this.registerListeners();

    const htmlPath = path.join(getPackageRoot(), 'lib', 'renderer.html');
    const rendererJsPath = path.join(getPackageRoot(), 'lib', 'renderer.js');
    this.win.loadURL(`file://${htmlPath}?js=${rendererJsPath}&hostWebContentsId=${this.hostWebContentsId}`);

    this.readyPromise = new Promise(resolve => { this.resolveReady = resolve; });
  }

  registerListeners() {
    ipc.on(this.channelName, this.handleMessages);
    this.emitter.on('renderer-ready', this.handleRendererReady);
    this.emitter.on('git-data', this.handleGitDataReceived);
    this.emitter.on('slow-spawns', this.handleDying);
  }

  @autobind
  handleMessages(event, {type, data}) {
    this.emitter.emit(type, data);
  }

  @autobind
  handleRendererReady({childWebContentsId}) {
    if (childWebContentsId === this.childWebContentsId) {
      this.resolveReady();
    }
  }

  @autobind
  handleGitDataReceived({operationId, results}) {
    const resolve = this.resolveByOperationId.get(operationId);
    resolve(results);
    this.resolveByOperationId.delete(operationId);

    if (this.dying && this.resolveByOperationId.size === 0) {
      this.destroy();
      this.onDestroyed(this);
    }
  }

  @autobind
  handleDying() {
    if (this.dying) { return; }
    this.dying = true;
    this.onDying(this.childWebContentsId);
  }

  send(data) {
    return new Promise(resolve => {
      this.resolveByOperationId.set(++this.operationId, resolve);
      this.win.webContents.send(`message-${this.childWebContentsId}`, {
        type: 'git-exec',
        data: {...data, operationId: this.operationId},
      });
    });
  }

  getReadyPromise() {
    return this.readyPromise;
  }

  destroy() {
    ipc.removeListener(this.channelName, this.handleMessages);
    this.emitter.dispose();
    this.win.destroy();
  }
}
