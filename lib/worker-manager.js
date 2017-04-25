import path from 'path';
import querystring from 'querystring';

import {remote, ipcRenderer as ipc} from 'electron';
const {BrowserWindow} = remote;
import {Emitter, Disposable, CompositeDisposable} from 'event-kit';
import {autobind} from 'core-decorators';

import {getPackageRoot} from './helpers';

export default class WorkerManager {
  static instance = null;

  static getInstance() {
    if (!this.instance) {
      this.instance = new WorkerManager();
    }
    return this.instance;
  }

  static reset() {
    if (this.instance) { this.instance.destroy(); }
    this.instance = null;
  }

  constructor() {
    this.workers = new Set();
    this.activeWorker = null;
    this.createNewWorker();
  }

  request(data) {
    if (this.destroyed) { throw new Error('Worker is destroyed'); }
    let operation;
    const requestPromise = new Promise(resolve => {
      operation = new Operation(data, resolve);
      return this.activeWorker.executeOperation(operation);
    });
    operation.setPromise(requestPromise);
    return requestPromise;
  }

  createNewWorker({operationCountLimit} = {operationCountLimit: 10}) {
    if (this.destroyed) { return; }
    this.activeWorker = new Worker({
      operationCountLimit,
      onDestroyed: this.onDestroyed,
      onCrashed: this.onCrashed,
      onSick: this.onSick,
    });
    this.workers.add(this.activeWorker);
  }

  @autobind
  onDestroyed(destroyedWorker) {
    this.workers.delete(destroyedWorker);
  }

  @autobind
  onCrashed(crashedWorker) {
    if (crashedWorker === this.getActiveWorker()) {
      this.createNewWorker({operationCountLimit: crashedWorker.getOperationCountLimit()});
    }
    crashedWorker.getRemainingOperations().forEach(operation => this.activeWorker.executeOperation(operation));
  }

  @autobind
  onSick(sickWorker) {
    const operationCountLimit = this.calculateNewOperationCountLimit(sickWorker);
    return this.createNewWorker({operationCountLimit});
  }

  calculateNewOperationCountLimit(lastWorker) {
    let operationCountLimit = 10;
    if (lastWorker.getOperationCountLimit() >= lastWorker.getCompletedOperationCount()) {
      operationCountLimit = Math.min(lastWorker.getOperationCountLimit() * 2, 100);
    }
    return operationCountLimit;
  }

  getActiveWorker() {
    return this.activeWorker;
  }

  destroy(force) {
    this.destroyed = true;
    this.workers.forEach(worker => worker.destroy(force));
  }
}


export class Worker {
  constructor({operationCountLimit, onSick, onCrashed, onDestroyed}) {
    this.operationCountLimit = operationCountLimit;
    this.onSick = onSick;
    this.onCrashed = onCrashed;
    this.onDestroyed = onDestroyed;

    this.operationsById = new Map();
    this.completedOperationCount = 0;
    this.sick = false;

    this.rendererProcess = new RendererProcess({
      loadUrl: this.getLoadUrl(operationCountLimit),
      onData: this.handleDataReceived,
      onExecStarted: this.handleExecStarted,
      onSick: this.handleSick,
      onCrashed: this.handleCrashed,
      onDestroyed: this.destroy,
    });
  }

  getLoadUrl(operationCountLimit) {
    const htmlPath = path.join(getPackageRoot(), 'lib', 'renderer.html');
    const rendererJsPath = path.join(getPackageRoot(), 'lib', 'worker.js');
    const qs = querystring.stringify({
      js: rendererJsPath,
      managerWebContentsId: this.getWebContentsId(),
      operationCountLimit,
    });
    return `file://${htmlPath}?${qs}`;
  }

  getWebContentsId() {
    return remote.getCurrentWebContents().id;
  }

  executeOperation(operation) {
    this.operationsById.set(operation.id, operation);
    return this.rendererProcess.executeOperation(operation);
  }

  @autobind
  handleDataReceived({id, results}) {
    const operation = this.operationsById.get(id);
    operation.complete(results);
    this.completedOperationCount++;
    this.operationsById.delete(id);

    if (this.sick && this.operationsById.size === 0) {
      this.destroy();
    }
  }

  @autobind
  handleExecStarted({id}) {
    const operation = this.operationsById.get(id);
    operation.setInProgress();
  }

  @autobind
  handleSick() {
    this.sick = true;
    this.onSick(this);
  }

  @autobind
  handleCrashed() {
    this.onCrashed(this);
    this.destroy();
  }

  getOperationCountLimit() {
    return this.operationCountLimit;
  }

  getCompletedOperationCount() {
    return this.completedOperationCount;
  }

  getRemainingOperations() {
    return Array.from(this.operationsById.values());
  }

  getPid() {
    return this.rendererProcess.getPid();
  }

  getReadyPromise() {
    return this.rendererProcess.getReadyPromise();
  }

  async destroy(force) {
    this.onDestroyed(this);
    if (this.operationsById.size > 0 && !force) {
      const remainingOperationPromises = this.getRemainingOperations()
        .map(operation => operation.getPromise());
      await Promise.all(remainingOperationPromises);
    }
    this.rendererProcess.destroy();
  }
}


/*
Sends operations to renderer processes
*/
export class RendererProcess {
  constructor({loadUrl, onDestroyed, onCrashed, onSick, onData, onExecStarted}) {
    this.onDestroyed = onDestroyed;
    this.onCrashed = onCrashed;
    this.onSick = onSick;
    this.onData = onData;
    this.onExecStarted = onExecStarted;

    this.win = new BrowserWindow({show: true || !!process.env.ATOM_GITHUB_SHOW_RENDERER_WINDOW});
    this.webContents = this.win.webContents;
    // this.webContents.openDevTools();
    this.channelName = `message-${this.webContents.id}`;

    this.emitter = new Emitter();
    this.subscriptions = new CompositeDisposable();
    this.subscriptions.add(
      new Disposable(() => this.win.destroy()),
      this.emitter,
    );
    this.registerListeners();

    this.win.loadURL(loadUrl);
    // okay to move these to register listeners?
    this.win.webContents.on('crashed', this.handleDestroy);
    this.win.webContents.on('destroyed', this.handleDestroy);

    this.readyPromise = new Promise(resolve => { this.resolveReady = resolve; });
  }

  @autobind
  handleMessages(event, {type, data}) {
    this.emitter.emit(type, data);
  }

  @autobind
  handleDestroy(...args) {
    this.destroy();
    this.onCrashed(...args);
  }

  registerListeners() {
    const handleMessages = (event, {type, data}) => {
      this.emitter.emit(type, data);
    };

    ipc.on(this.channelName, handleMessages);
    this.emitter.on('renderer-ready', ({pid}) => {
      this.pid = pid;
      this.resolveReady();
    });
    this.emitter.on('git-data', this.onData);
    this.emitter.on('exec-started', this.onExecStarted);
    this.emitter.on('slow-spawns', this.onSick);

    this.subscriptions.add(
      new Disposable(() => ipc.removeListener(this.channelName, handleMessages)),
    );
  }

  async executeOperation(operation) {
    // TODO: for now let's just queue up promises for execution.
    // in the future we'll probably shell out in process while awaiting the renderer to be ready
    await this.readyPromise; // Is this bad for always putting things on the next tick?
    return operation.execute(payload => {
      if (this.destroyed) { return null; }
      return this.webContents.send(this.channelName, {
        type: 'git-exec',
        data: payload,
      });
    });
  }

  getPid() {
    return this.pid;
  }

  getReadyPromise() {
    return this.readyPromise;
  }

  destroy() {
    this.destroyed = true;
    this.subscriptions.dispose();
  }
}


export class Operation {
  static status = {
    PENDING: Symbol('pending'),
    INPROGRESS: Symbol('in-progress'),
    COMPLETE: Symbol('complete'),
  }

  static id = 0;

  constructor(data, resolve) {
    this.id = Operation.id++;
    this.data = data;
    this.resolve = resolve;
    this.promise = null;
    this.status = Operation.status.PENDING;
    this.results = null;
  }

  setPromise(promise) {
    this.promise = promise;
  }

  getPromise() {
    return this.promise;
  }

  setInProgress() {
    // after exec has been called but before results a received
    this.status = Operation.status.INPROGRESS;
  }

  complete(results) {
    this.results = results;
    this.resolve(results);
    this.status = Operation.status.COMPLETE;
  }

  execute(execFn) {
    return execFn({...this.data, id: this.id});
  }
}
