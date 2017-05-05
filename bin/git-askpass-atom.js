const net = require('net');
const {execFile} = require('child_process');

const sockPath = process.argv[2];
const prompt = process.argv[3];

const diagnosticsEnabled = process.env.GIT_TRACE && process.env.GIT_TRACE.length !== 0;
const userAskPass = process.env.ATOM_GITHUB_ORIGINAL_SSH_ASKPASS || '';
const workdirPath = process.env.ATOM_GITHUB_WORKDIR_PATH;

function log(message) {
  if (!diagnosticsEnabled) {
    return;
  }

  process.stderr.write(`git-askpass-atom: ${message}\n`);
}

function userHelper() {
  return new Promise((resolve, reject) => {
    if (userAskPass.length === 0) {
      log('no user askpass specified');

      reject(new Error('No user SSH_ASKPASS'));
      return;
    }

    log(`attempting user askpass: ${userAskPass}`);

    // Present on ${PATH} even in Windows from dugite!
    execFile('sh', ['-c', `'${userAskPass}' '${prompt}'`], {cwd: workdirPath}, (err, stdout, stderr) => {
      if (err) {
        log(`user askpass failed. this is ok\n${err.stack}`);

        reject(err);
        return;
      }

      log('collected password from user askpass');
      resolve(stdout);
    });
  });
}

function dialog() {
  const payload = {prompt, includeUsername: false, pid: process.pid};
  log('requesting dialog through Atom socket');
  log(`prompt = "${prompt}"`);

  return new Promise((resolve, reject) => {
    const socket = net.connect(sockPath, () => {
      log('connection established');
      const parts = [];

      socket.on('data', data => parts.push(data));
      socket.on('end', () => {
        log('Atom socket stream terminated');

        try {
          const replyDocument = JSON.parse(parts.join(''));
          log('Atom reply parsed');
          resolve(replyDocument.password);
        } catch (err) {
          log('Unable to parse reply from Atom');
          reject(err);
        }
      });

      log('writing payload');
      socket.write(JSON.stringify(payload) + '\u0000', 'utf8');
      log('payload written');
    });
    socket.setEncoding('utf8');
  });
}

userHelper()
  .catch(() => dialog())
  .then(password => {
    process.stdout.write(password);
    log('success');
    process.exit(0);
  }, err => {
    process.stderr.write(`Unable to prompt through Atom:\n${err.stack}`);
    log('failure');
    process.exit(1);
  });
