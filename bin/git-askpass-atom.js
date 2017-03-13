const net = require('net');
const {exec} = require('child_process');

const sockPath = process.argv[2];
const prompt = process.argv[3];

const userAskPass = process.env.ATOM_GITHUB_ORIGINAL_SSH_ASKPASS || '';
const workdirPath = process.env.ATOM_GITHUB_WORKDIR_PATH;

function dialog() {
  const payload = {prompt, includeUsername: false};

  return new Promise((resolve, reject) => {
    const socket = net.connect(sockPath, () => {
      const parts = [];

      socket.on('data', data => parts.push(data));
      socket.on('end', () => {
        try {
          const replyDocument = JSON.parse(parts.join(''));
          resolve(replyDocument.password);
        } catch (err) {
          reject(err);
        }
      });

      socket.write(JSON.stringify(payload) + '\u0000', 'utf8');
    });
    socket.setEncoding('utf8');
  });
}

function userHelper() {
  return new Promise((resolve, reject) => {
    if (userAskPass.length === 0) {
      reject(new Error('No user SSH_ASKPASS'));
      return;
    }

    exec(userAskPass, {cwd: workdirPath}, (err, stdout, stderr) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(stdout);
    });
  });
}

userHelper()
  .catch(() => dialog())
  .then(password => {
    process.stdout.write(password);
    process.exit(0);
  }, err => {
    process.stderr.write(`Unable to prompt through Atom:\n${err.stack}`);
    process.exit(1);
  });
