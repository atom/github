const path = require('path');
const fs = require('fs');
const net = require('net');
const readline = require('readline');

const diagnosticsEnabled = process.env.GIT_TRACE && process.env.GIT_TRACE.length !== 0;
const socketPath = process.env.ATOM_GITHUB_SOCK_PATH;

let logStream = null;

const INFO = {
  flavor: 'atom:atom',
  version: '0.0.0',
  pid: process.pid,
};

async function main() {
  let exitCode = 1;
  try {
    process.stdout.write('OK Your orders please\n');
    exitCode = await parseStdin();
  } catch (err) {
    log(`Failed with error:\n${err}`);
  } finally {
    await cleanup();
    process.exit(exitCode);
  }
}

function parseStdin() {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({input: process.stdin});
    const state = {
      desc: 'Please enter the passphrase for your default GPG signing key.',
      error: null,
      exit: null,
    };

    rl.on('line', async line => {
      Object.assign(state, await handleCommand(line, state));
      if (state.exit !== null) {
        resolve(state.exit);
      }
    });

    rl.on('close', () => {
      if (state.exit !== null) {
        state.exit = 1;
        resolve(state.exit);
      }
    });
  });
}

function handleDefault() {
  process.stdout.write('OK\n');
  return {};
}

function handleGetInfo(param) {
  const reply = INFO[param];
  if (reply) {
    process.stdout.write(`D ${reply}\n`);
  }
  process.stdout.write('OK\n');
  return {};
}

function handleSetDesc(param) {
  process.stdout.write('OK\n');
  return {prompt: decodeURI(param)};
}

function handleSetError(param) {
  process.stdout.write('OK\n');
  return {error: decodeURI(param)};
}

async function handleGetPin(param, state) {
  const passphrase = await dialog(state);
  process.stdout.write(`D ${encodeURI(passphrase)}\nOK\n`);
  return {};
}

function handleBye() {
  return {exit: 0};
}

const COMMANDS = {
  GETINFO: handleGetInfo,
  SETDESC: handleSetDesc,
  SETERROR: handleSetError,
  GETPIN: handleGetPin,
  BYE: handleBye,
};

function handleCommand(line, state) {
  log(`Command: ${line}`);

  let handler = handleDefault;
  let param = null;
  const match = /^(\S+)(?:\s+(.+))?/.exec(line);
  if (match) {
    handler = COMMANDS[match[1]] || handleDefault;
    param = match[2];
  }

  return handler(param, state);
}

/*
 * Request a dialog in Atom by writing a null-delimited JSON query to the socket.
 */
function dialog(state) {
  const payload = {
    error: state.error,
    prompt: state.prompt,
    includeUsername: false,
    pid: process.pid,
  };

  return new Promise((resolve, reject) => {
    log('Requesting dialog through Atom socket.');

    const socket = net.connect(socketPath, () => {
      log('Connection established.');

      const parts = [];

      socket.on('data', data => parts.push(data));
      socket.on('end', () => {
        log('Atom socket stream terminated.');
        try {
          const reply = JSON.parse(parts.join(''));
          resolve(reply.password);
        } catch (e) {
          log(`Unable to parse reply from Atom:\n${parts.join('')}`);
          reject(e);
        }
      });

      log('Sending payload.');
      socket.write(JSON.stringify(payload) + '\u0000', 'utf8');
      log('Payload sent.');
    });
    socket.setEncoding('utf8');
  });
}

/*
 * Emit diagnostic messages to stderr if GIT_TRACE is set to a non-empty value.
 */
function log(message) {
  if (!diagnosticsEnabled) {
    return;
  }

  if (!logStream) {
    const logFile = path.join(process.env.ATOM_GITHUB_TMP, 'gpg-pinentry.log');
    logStream = fs.createWriteStream(logFile, {defaultEncoding: 'utf8'});
  }

  logStream.write(message + '\n');
}

async function cleanup() {
  if (logStream) {
    await new Promise(resolve => logStream.end('\n', 'utf8', resolve));
  }
}

main();
