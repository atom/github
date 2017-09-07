import os from 'os';
import path from 'path';
import {getPackageRoot, deleteFileOrFolder, getTempDir, copyFile, chmodFile} from './helpers';

export const BIN_SCRIPTS = {
  getCredentialHelperJs: 'git-credential-atom.js',
  getCredentialHelperSh: 'git-credential-atom.sh',
  getAskPassJs: 'git-askpass-atom.js',
  getAskPassSh: 'git-askpass-atom.sh',
  getSshWrapperSh: 'linux-ssh-wrapper.sh',
  getGpgWrapperSh: 'gpg-wrapper.sh',
};

export default class GitTempDir {
  constructor() {
    this.created = false;
  }

  async ensure() {
    if (this.created) {
      return;
    }

    this.root = await getTempDir({
      dir: process.platform === 'win32' ? os.tmpdir() : '/tmp',
      prefix: 'github-',
      symlinkOk: true,
    });

    await Promise.all(
      Object.values(BIN_SCRIPTS).map(async filename => {
        await copyFile(
          path.resolve(getPackageRoot(), 'bin', filename),
          path.join(this.root, filename),
        );

        if (path.extname(filename) === '.sh') {
          await chmodFile(path.join(this.root, filename), 0o700);
        }
      }),
    );

    this.created = true;
  }

  getRootPath() {
    return this.root;
  }

  getScriptPath(filename) {
    if (!this.created) {
      throw new Error(`Attempt to access filename ${filename} in uninitialized GitTempDir`);
    }

    return path.join(this.root, filename);
  }

  getSocketPath() {
    if (process.platform === 'win32') {
      return path.join(
        '\\\\?\\pipe\\',
        'gh-' + require('crypto').randomBytes(8).toString('hex'),
        'helper.sock',
      );
    } else {
      return this.getScriptPath('helper.sock');
    }
  }

  dispose() {
    return deleteFileOrFolder(this.root);
  }
}

function createGetter(key) {
  const filename = BIN_SCRIPTS[key];
  return function() {
    return this.getScriptPath(filename);
  };
}

for (const key in BIN_SCRIPTS) {
  GitTempDir.prototype[key] = createGetter(key);
}
