const net = require('net');
const readline = require('readline');
const url = require('url');
const {execFile} = require('child_process');
const {GitProcess} = require(process.env.ATOM_GITHUB_DUGITE_PATH);

const diagnosticsEnabled = process.env.GIT_TRACE && process.env.GIT_TRACE.length !== 0;
const workdirPath = process.env.ATOM_GITHUB_WORKDIR_PATH;
const sockPath = process.argv[2];
const action = process.argv[3];

function log(message) {
  if (!diagnosticsEnabled) {
    return;
  }

  process.stderr.write(`git-credential-atom: ${message}\n`);
}

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

    log('discover credential helpers from system git configuration');
    log(`PATH = ${env.PATH}`);

    execFile('git', ['config', '--system', '--get-all', 'credential.helper'], {env}, (error, stdout, stderr) => {
      if (error) {
        log(`failed to list credential helpers. this is ok\n${error.stack}`);

        // Oh well, c'est la vie
        resolve([]);
        return;
      }

      const helpers = stdout.split(/\n+/).map(line => line.trim()).filter(each => each.length > 0);
      log(`discovered system credential helpers: ${helpers.map(h => `"${h}"`).join(', ')}`);
      resolve(helpers);
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

    log('attempting to use user-configured credential helpers');
    log(`PATH = ${env.PATH}`);
    log(`GIT_ASKPASS = ${env.GIT_ASKPASS}`);
    log(`SSH_ASKPASS = ${env.SSH_ASKPASS}`);
    log(`arguments = ${args.join(' ')}`);
    log(`stdin =\n${stdin}`);

    return GitProcess.exec(args, workdirPath, {env, stdin, stdinEncoding});
  })
  .then(({stdout, stderr, exitCode}) => {
    if (exitCode !== 0) {
      log(`user-configured credential helpers failed with exit code ${exitCode}. this is ok`);
      log(`stdout:\n${stdout}`);
      log(`stderr:\n${stderr}`);

      throw new Error('git-credential fill failed');
    }

    if (/password=/.test(stdout)) {
      log('password received from user-configured credential helper');

      return stdout;
    } else {
      log(`no password received from user-configured credential helper:\n${stdout}`);

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
    log('requesting dialog through Atom socket');
    log(`prompt = "${prompt}" includeUsername = ${includeUsername}`);

    const socket = net.connect(sockPath, () => {
      log('connection established');

      const parts = [];

      socket.on('data', data => parts.push(data));
      socket.on('end', () => {
        log('Atom socket stream terminated');

        try {
          const reply = JSON.parse(parts.join(''));

          const lines = [];
          ['protocol', 'host', 'username', 'password'].forEach(k => {
            const value = reply[k] !== undefined ? reply[k] : query[k];
            lines.push(`${k}=${value}\n`);
          });

          log('Atom reply parsed');
          resolve(lines.join('') + 'quit=true\n');
        } catch (e) {
          log(`Unable to parse reply from Atom:\n${e.stack}`);
          reject(e);
        }
      });

      log('writing payload');
      socket.write(JSON.stringify(payload) + '\u0000', 'utf8');
      log('payload written');
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
    log(`parsed from stdin: [${key}] = [${value}]`);

    query[key] = value;
  });

  rl.on('close', () => {
    log('all input received');

    fill(query).catch(() => dialog(query)).then(reply => {
      process.stdout.write(reply);
      log('success');
      process.exit(0);
    }).catch(err => {
      process.stderr.write(`Unable to prompt through Atom:\n${err.stack}`);
      log('failure');
      process.stdout.write('quit=true\n\n');
      process.exit(0);
    });
  });
}

log(`working directory = ${workdirPath}`);
log(`socket path = ${sockPath}`);
log(`action = ${action}`);

switch (action) {
  case 'get':
    get();
    break;
  default:
    process.exit(0);
    break;
}
