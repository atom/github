const net = require('net');
const readline = require('readline');
const url = require('url');
const {execFile} = require('child_process');

process.stderr.write(`dugite path: ${process.env.ATOM_GITHUB_DUGITE_PATH}`);

const {GitProcess} = require(process.env.ATOM_GITHUB_DUGITE_PATH);

const workdirPath = process.env.ATOM_GITHUB_WORKDIR_PATH;
const sockPath = process.argv[2];
const action = process.argv[3];

/*
 * Because the git within dugite was (possibly) built with a different $PREFIX than the user's native git,
 * credential helpers or other config settings from the system configuration may not be discovered. Attempt
 * to collect them by running the native git, if one is present.
 */
function systemCredentialHelpers() {
  return new Promise(resolve => {
    const env = {
      PATH: process.env.ATOM_GITHUB_ORIGINAL_PATH || '',
      GIT_CONFIG_PARAMETERS: '',
    };

    execFile('git', ['config', '--system', '--get-all', 'credential.helper'], {env}, (error, stdout, stderr) => {
      if (error) {
        // Oh well, c'est la vie
        resolve([]);
        return;
      }

      resolve(stdout.split(/\n+/).map(line => line.trim()).filter(each => each.length > 0));
    });
  });
}

/*
 * Attempt to use user-configured credential handlers through the normal git channels. If they actually work,
 * hooray! Report the results to stdout. Otherwise, reject the promise and collect credentials through Atom.
 */
function fill(query) {
  return systemCredentialHelpers()
  .then(systemHelpers => {
    const env = {
      GIT_ASKPASS: process.env.ATOM_GITHUB_ORIGINAL_GIT_ASKPASS || '',
      SSH_ASKPASS: process.env.ATOM_GITHUB_ORIGINAL_SSH_ASKPASS || '',
      GIT_CONFIG_PARAMETERS: '', // Only you can prevent forkbombs
      PATH: process.env.ATOM_GITHUB_ORIGINAL_PATH || '',
    };

    const stdin = Object.keys(query).map(k => `${k}=${query[k]}\n`).join('') + '\n';
    const stdinEncoding = 'utf8';

    const args = [];
    systemHelpers.forEach(helper => args.push('-c', `credential.helper=${helper}`));
    args.push('credential', 'fill');

    return GitProcess.exec(args, workdirPath, {env, stdin, stdinEncoding});
  })
  .then(({stdout, stderr, exitCode}) => {
    // process.stderr.write(`credential fill output:\n---\n${stdout}\n---\n${stderr}\n---\n`);
    if (exitCode !== 0) {
      throw new Error('git-credential fill failed');
    }

    if (/password=/.test(stdout)) {
      return stdout;
    } else {
      throw new Error('No password reported from upstream git-credential fill');
    }
  });
}

function dialog(query) {
  if (query.username) {
    query.auth = query.username;
  }
  const prompt = 'Please enter your credentials for ' + url.format(query);
  const includeUsername = !query.username;

  const payload = {prompt, includeUsername};

  return new Promise((resolve, reject) => {
    const socket = net.connect(sockPath, () => {
      const parts = [];

      socket.on('data', data => parts.push(data));
      socket.on('end', () => {
        try {
          const reply = JSON.parse(parts.join(''));

          const lines = [];
          ['protocol', 'host', 'username', 'password'].forEach(k => {
            const value = reply[k] !== undefined ? reply[k] : query[k];
            lines.push(`${k}=${value}\n`);
          });

          resolve(lines.join('') + '\n');
        } catch (e) {
          reject(e);
        }
      });

      socket.write(JSON.stringify(payload) + '\u0000', 'utf8');
    });
    socket.setEncoding('utf8');
  });
}

function get() {
  const rl = readline.createInterface({input: process.stdin});

  const query = {};

  rl.on('line', line => {
    if (line.length === 0) {
      return;
    }

    const ind = line.indexOf('=');
    if (ind === -1) {
      process.stderr.write(`Unable to parse credential line: ${line}`);
      process.exit(1);
    }

    const key = line.substring(0, ind);
    const value = line.substring(ind + 1).replace(/\n$/, '');

    query[key] = value;
  });

  rl.on('close', () => {
    // All input received.
    fill(query).catch(() => dialog(query)).then(reply => {
      process.stdout.write(reply);
      process.exit(0);
    }).catch(err => {
      process.stderr.write(`Unable to prompt through Atom:\n${err.stack}`);
      process.exit(1);
    });
  });
}

switch (action) {
  case 'get':
    get();
    break;
  default:
    process.exit(0);
    break;
}
