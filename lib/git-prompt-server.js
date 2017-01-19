import net from 'net';
import path from 'path';
import os from 'os';

import {Emitter} from 'atom';

import Prompt from './views/prompt';
import {deleteFileOrFolder, getTempDir, copyFile} from './helpers';

function getAtomHelperPath() {
  if (process.platform === 'darwin') {
    return path.resolve(process.resourcesPath, '..', 'Frameworks',
     'Atom Helper.app', 'Contents', 'MacOS', 'Atom Helper');
  } else {
    return process.execPath;
  }
}

function getInputViaPrompt(query) {
  return new Promise((resolve, reject) => {
    const component = new Prompt({
      message: query,
      onCancel: () => {
        reject();
        panel.destroy();
        component.destroy(false);
      },
      onSubmit: answer => {
        resolve(answer);
        panel.destroy();
        component.destroy(false);
      },
    });
    const panel = atom.workspace.addModalPanel({item: component});
  });
}

export default class GitPromptServer {
  constructor() {
    this.emitter = new Emitter();
  }

  async start(promptForInput = getInputViaPrompt) {
    // TODO: [mkt] Windows?? yes.
    this.promptForInput = promptForInput;
    const windows = process.platform === 'win32';
    const prefix = windows ? os.tmpdir() : '/tmp';
    this.tmpFolderPath = await getTempDir(path.join(prefix, 'github-'));
    const helperPath = await copyFile(
      path.resolve(__dirname, '..', 'bin', 'git-prompt-server-script.js'),
      path.join(this.tmpFolderPath, 'script.js'),
    );
    const launcherPath = await copyFile(
      path.resolve(__dirname, '..', 'bin', 'git-prompt-server-launcher.sh'),
      path.join(this.tmpFolderPath, 'launcher.sh'),
    );
    const socketPath = path.join(this.tmpFolderPath, 'helper.sock');
    const namedPipePath = path.join(
      '\\\\?\\pipe\\', 'gh-' + require('crypto').randomBytes(8).toString('hex'),
      'helper.sock',
    );
    this.server = await this.startListening(windows ? namedPipePath : socketPath);

    return {
      socket: windows ? namedPipePath : socketPath,
      electron: getAtomHelperPath(),
      launcher: launcherPath,
      helper: helperPath,
    };
  }

  startListening(socketPath) {
    return new Promise(resolve => {
      const server = net.createServer(connection => {
        connection.setEncoding('utf8');
        connection.on('data', data => this.handleData(connection, data));
      });

      server.listen(socketPath, () => resolve(server));
    });
  }

  handleData(connection, data) {
    Promise.resolve(this.promptForInput(data))
      .then(answer => {
        connection.write(answer);
      })
      .catch(() => {
        this.emitter.emit('did-cancel');
      });
  }

  onDidCancel(cb) {
    return this.emitter.on('did-cancel', cb);
  }

  async terminate() {
    await new Promise(resolve => this.server.close(resolve));
    await deleteFileOrFolder(this.tmpFolderPath);
    this.emitter.dispose();
  }
}
