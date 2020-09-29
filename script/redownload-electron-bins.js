// Based on: https://github.com/atom/atom/blob/v1.51.0/script/redownload-electron-bins.js

let downloadMksnapshotPath

try {
  downloadMksnapshotPath = require.resolve('electron-mksnapshot/download-mksnapshot.js');
} catch { }

if (typeof(downloadMksnapshotPath) !== 'undefined') {

  const { spawn } = require('child_process');
  const path = require('path');
  const fs = require('fs');

  const atomRepoPath = path.join(__dirname, '..', '..', '..', '..', 'atom', 'package.json');
  const electronVersion = fs.existsSync(atomRepoPath) ? require(atomRepoPath).electronVersion : '6.1.12'
  // TODO: Keep the above "electronVersion" in sync with "electronVersion" from Atom's package.json

  if (process.env.ELECTRON_CUSTOM_VERSION !== electronVersion) {
    const electronEnv = process.env.ELECTRON_CUSTOM_VERSION;
    console.info(
      `env var ELECTRON_CUSTOM_VERSION is not set,\n` +
        `or doesn't match electronVersion in atom/package.json.\n` +
        `(is: "${electronEnv}", wanted: "${electronVersion}").\n` +
        `Setting, and re-downloading mksnapshot.\n`
    );

    process.env.ELECTRON_CUSTOM_VERSION = electronVersion;
    const downloadMksnapshot = spawn('node', [downloadMksnapshotPath]);
    var exitStatus;

    downloadMksnapshot.on('close', code => {
      if (code === 0) {
        exitStatus = 'success';
      } else {
        exitStatus = 'error';
      }

      console.info(`info: Done re-downloading mksnapshot. Status: ${exitStatus}`);
    });
  } else {
    console.info(
      'info: env var "ELECTRON_CUSTOM_VERSION" is already set correctly.\n(No need to re-download mksnapshot). Skipping.\n'
    );
  }
} else {
  console.log('devDependency "electron-mksnapshot/download-mksnapshot.js" not found.\nSkipping "redownload electron bins" script.\n')
}
