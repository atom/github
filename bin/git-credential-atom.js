const net = require('net');
const readline = require('readline');
const url = require('url');
const fs = require('fs');
const path = require('path');
const {execFile} = require('child_process');
const {GitProcess} = require(process.env.ATOM_GITHUB_DUGITE_PATH);

const diagnosticsEnabled = process.env.GIT_TRACE && process.env.GIT_TRACE.length !== 0;
const workdirPath = process.env.ATOM_GITHUB_WORKDIR_PATH;
const inSpecMode = process.env.ATOM_GITHUB_SPEC_MODE === 'true';
const sockPath = process.argv[2];
const action = process.argv[3];

const rememberFile = path.join(__dirname, 'remember');

/*
 * Emit diagnostic messages to stderr if GIT_TRACE is set to a non-empty value.
 */
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
  if (inSpecMode) {
    // Skip system credential helpers in spec mode to maintain reproduceability across systems.
    return Promise.resolve([]);
  }

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
 * Dispatch a `git credential` subcommand to all configured credential helpers. Return a Promise that
 * resolves with the exit status, stdout, and stderr of the subcommand.
 */
function withAllHelpers(query, subAction) {
  return systemCredentialHelpers()
  .then(systemHelpers => {
    const env = {
      GIT_ASKPASS: process.env.ATOM_GITHUB_ORIGINAL_GIT_ASKPASS || '',
      SSH_ASKPASS: process.env.ATOM_GITHUB_ORIGINAL_SSH_ASKPASS || '',
      GIT_CONFIG_PARAMETERS: '', // Only you can prevent forkbombs
    };

    const stdin = Object.keys(query).map(k => `${k}=${query[k]}\n`).join('') + '\n';
    const stdinEncoding = 'utf8';

    const args = [];
    systemHelpers.forEach(helper => args.push('-c', `credential.helper=${helper}`));
    args.push('credential', subAction);

    log(`attempting to run ${subAction} with user-configured credential helpers`);
    log(`GIT_ASKPASS = ${env.GIT_ASKPASS}`);
    log(`SSH_ASKPASS = ${env.SSH_ASKPASS}`);
    log(`arguments = ${args.join(' ')}`);
    log(`stdin =\n${stdin.replace(/password=[^\n]+/, 'password=*******')}`);

    return GitProcess.exec(args, workdirPath, {env, stdin, stdinEncoding});
  });
}

/*
 * Parse `key=value` lines from stdin until EOF or the first blank line.
 */
function parse() {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({input: process.stdin});

    let resolved = false;
    const query = {};

    rl.on('line', line => {
      if (resolved) {
        return;
      }

      if (line.length === 0) {
        log('all input received: blank line received');
        resolved = true;
        resolve(query);
        return;
      }

      const ind = line.indexOf('=');
      if (ind === -1) {
        reject(new Error(`Unable to parse credential line: ${line}`));
        return;
      }

      const key = line.substring(0, ind);
      const value = line.substring(ind + 1).replace(/\n$/, '');
      log(`parsed from stdin: [${key}] = [${key === 'password' ? '******' : value}]`);

      query[key] = value;
    });

    rl.on('close', () => {
      if (resolved) {
        return;
      }

      log('all input received: EOF from stdin');
      resolved = true;
      resolve(query);
    });
  });
}

/*
 * Attempt to use user-configured credential handlers through the normal git channels. If they actually work,
 * hooray! Report the results to stdout. Otherwise, reject the promise and collect credentials through Atom.
 */
function fromOtherHelpers(query) {
  return withAllHelpers(query, 'fill')
  .then(({stdout, stderr, exitCode}) => {
    if (exitCode !== 0) {
      log(`stdout:\n${stdout}`);
      log(`stderr:\n${stderr}`);
      log(`user-configured credential helpers failed with exit code ${exitCode}. this is ok`);

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

/*
 * This is a placeholder for eventual support of storage of credentials in an OS keychain.
 */
function fromKeytar(query) {
  return Promise.reject(new Error('Not implemented'));
}

/*
 * Request a dialog in Atom by writing a null-delimited JSON query to the socket we were given.
 */
function dialog(query) {
  if (query.username) {
    query.auth = query.username;
  }
  const prompt = 'Please enter your credentials for ' + url.format(query);
  const includeUsername = !query.username;

  const payload = {prompt, includeUsername, pid: process.pid};

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

          const writeReply = function() {
            const lines = [];
            ['protocol', 'host', 'username', 'password'].forEach(k => {
              const value = reply[k] !== undefined ? reply[k] : query[k];
              lines.push(`${k}=${value}\n`);
            });

            log('Atom reply parsed');
            resolve(lines.join('') + 'quit=true\n');
          };

          if (reply.remember) {
            fs.writeFile(rememberFile, writeReply);
          } else {
            writeReply();
          }
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
  parse()
    .then(query => {
      return fromOtherHelpers(query)
        .catch(() => fromKeytar(query))
        .catch(() => dialog(query));
    })
    .then(reply => {
      process.stdout.write(reply);
      log('success');
      process.exit(0);
    }, err => {
      process.stderr.write(`Unable to prompt through Atom:\n${err.stack}`);
      log('failure');
      process.stdout.write('quit=true\n\n');
      process.exit(0);
    });
}

function store() {
  parse()
    .then(query => withAllHelpers(query, 'approve'))
    .then(() => process.exit(0), () => process.exit(1));
}

function erase() {
  parse()
    .then(query => withAllHelpers(query, 'reject'))
    .then(() => process.exit(0), () => process.exit(1));
}

log(`working directory = ${workdirPath}`);
log(`socket path = ${sockPath}`);
log(`action = ${action}`);

switch (action) {
  case 'get':
    get();
    break;
  case 'store':
    store();
    break;
  case 'erase':
    erase();
    break;
  default:
    log(`Unrecognized command: ${action}`);
    process.exit(0);
    break;
}
