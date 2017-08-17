import net from 'net';
import path from 'path';
import os from 'os';

import {Emitter} from 'event-kit';

import {getPackageRoot, deleteFileOrFolder, getTempDir, copyFile} from './helpers';

function getAtomHelperPath() {
  if (process.platform === 'darwin') {
    const beta = atom.appVersion.match(/-beta/);
    const appName = beta ? 'Atom Beta Helper' : 'Atom Helper';
    return path.resolve(process.resourcesPath, '..', 'Frameworks',
     `${appName}.app`, 'Contents', 'MacOS', appName);
  } else {
    return process.execPath;
  }
}

export default class GitPromptServer {
  constructor() {
    this.emitter = new Emitter();
  }

  async start(promptForInput) {
    // TODO: [mkt] Windows?? yes.
    this.promptForInput = promptForInput;
    const windows = process.platform === 'win32';
    this.tmpFolderPath = await getTempDir({
      dir: windows ? os.tmpdir() : '/tmp',
      prefix: 'github-',
      symlinkOk: true,
    });

    const credentialHelper = {};
    const askPass = {};
    const sshWrapper = {};
    const gpgWrapper = {};

    const sourceFiles = {
      'git-credential-atom.js': outfile => (credentialHelper.script = outfile),
      'git-credential-atom.sh': outfile => (credentialHelper.launcher = outfile),
      'git-askpass-atom.js': outfile => (askPass.script = outfile),
      'git-askpass-atom.sh': outfile => (askPass.launcher = outfile),
      'linux-ssh-wrapper.sh': outfile => (sshWrapper.script = outfile),
      'gpg-wrapper.sh': outfile => (gpgWrapper.launcher = outfile),
    };

    await Promise.all(
      Object.keys(sourceFiles).map(filename => copyFile(
        path.resolve(getPackageRoot(), 'bin', filename),
        path.join(this.tmpFolderPath, filename),
      ).then(sourceFiles[filename])),
    );

    const socketPath = path.join(this.tmpFolderPath, 'helper.sock');
    const namedPipePath = path.join(
      '\\\\?\\pipe\\', 'gh-' + require('crypto').randomBytes(8).toString('hex'),
      'helper.sock',
    );
    this.server = await this.startListening(windows ? namedPipePath : socketPath);

    return {
      socket: windows ? namedPipePath : socketPath,
      tmpdir: this.tmpFolderPath,
      electron: getAtomHelperPath(),
      credentialHelper,
      askPass,
      sshWrapper,
      gpgWrapper,
    };
  }

  startListening(socketPath) {
    return new Promise(resolve => {
      const server = net.createServer(connection => {
        connection.setEncoding('utf8');

        const parts = [];

        connection.on('data', data => {
          const nullIndex = data.indexOf('\u0000');
          if (nullIndex === -1) {
            parts.push(data);
          } else {
            parts.push(data.substring(0, nullIndex));
            this.handleData(connection, parts.join(''));
          }
        });
      });

      server.listen(socketPath, () => resolve(server));
    });
  }

  handleData(connection, data) {
    let query;
    try {
      query = JSON.parse(data);
    } catch (e) {
      this.emitter.emit('did-cancel');
    }

    Promise.resolve(this.promptForInput(query))
      .then(answer => connection.end(JSON.stringify(answer), 'utf-8'))
      .catch(() => this.emitter.emit('did-cancel', {handlerPid: query.pid}));
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
