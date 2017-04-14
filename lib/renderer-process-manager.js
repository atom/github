const remote = require('electron').remote;
const {BrowserWindow} = remote;
const ipc = require('electron').ipcRenderer;

const {GitProcess} = require('dugite');

import GitError from './git-shell-out-strategy';


export default class RendererProcessManager {
  constructor() {
    this.resolveByOperationId = new Map();
    this.operationId = 0;
    this.webContentsId = remote.getCurrentWebContents().id;
    global.requestCounter = 0;
    this.renderer = null;
    this.createNewRenderer();

    ipc.on('pong', (event, {type, data}) => {
      console.log('operationId', data.operationId);
      if (type === 'git') {
        const resolve = this.resolveByOperationId.get(data.operationId);
        global.requestCounter--;
        if (data.err) {
          const error = new GitError(data.err.message);
          Object.assign(error, data.err);
          resolve(Promise.reject(error)); // TODO: check this
        } else {
          resolve(data.result);
        }
        const execTime = data.execTime;
        const totalTime = performance.now() - data.timeSent;
        console.debug(`git data for ${data.formattedArgs}`, data);
        console.debug('times (total, exec, ipc)', Math.round(totalTime), Math.round(execTime), Math.round(totalTime - execTime));
      } else {
        console.log('unrecognized type');
      }
    });
  }

  send(resolve, data) {
    if (this.renderer && this.renderer.isReady()) {
      console.log('renderer ready!');
      this.resolveByOperationId.set(++this.operationId, resolve);
      this.renderer.send({...data, operationId: this.operationId});
    } else {
      console.log('shell out until renderer is ready');
      resolve(GitProcess.exec(data.args, data.workingDir, data.options)
        .then(({stdout, stderr, exitCode}) => {
          const formattedArgs = `git ${data.args.join(' ')} in ${data.workingDir}`;
          // timingMarker.finalize();
          // if (process.env.PRINT_GIT_TIMES) {
          //   console.timeEnd(`git:${formattedArgs}`);
          // }
          // if (gitPromptServer) {
          //   gitPromptServer.terminate();
          // }
          // subscriptions.dispose();
          //
          // if (diagnosticsEnabled) {
          //   const headerStyle = 'font-weight: bold; color: blue;';
          //
          //   console.groupCollapsed(`git:${formattedArgs}`);
          //   console.log('%cexit status%c %d', headerStyle, 'font-weight: normal; color: black;', exitCode);
          //   console.log('%cstdout', headerStyle);
          //   console.log(stdout);
          //   console.log('%cstderr', headerStyle);
          //   console.log(stderr);
          //   console.groupEnd();
          // }

          if (exitCode) {
            const err = new GitError(
              `${formattedArgs} exited with code ${exitCode}\nstdout: ${stdout}\nstderr: ${stderr}`,
            );
            err.code = exitCode;
            err.stdErr = stderr;
            err.stdOut = stdout;
            err.command = formattedArgs;
            return Promise.reject(err);
          }
          return stdout;
        }));
    }
  }

  createNewRenderer() {
    if (this.renderer) { this.renderer.destroy(); }
    this.renderer = new RendererProcess(this.webContentsId);
  }
}

class RendererProcess {
  constructor(webContentsId) {
    console.log('create renderer process');
    this.webContentsId = webContentsId;
    this.win = new BrowserWindow();
    this.win.webContents.openDevTools();
    this.win.loadURL('file:///Users/kuychaco/github/github/lib/renderer.html');
    this.ready = false;
    this.win.webContents.once('dom-ready', () => this.ready = true);
  }

  send(data) {
    console.log('send data');
    this.win.webContents.send('ping', this.webContentsId, data);
  }

  isReady() {
    return this.ready;
  }

  destroy() {
    // after last response is received, shut down
  }
}
