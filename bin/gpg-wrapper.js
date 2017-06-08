const os = require('os');
const fs = require('fs');
const path = require('path');
const {execFile, spawn} = require('child_process');
const {GitProcess} = require(process.env.ATOM_GITHUB_DUGITE_PATH);

const atomTmp = process.env.ATOM_GITHUB_TMP || '';
const diagnosticsEnabled = process.env.GIT_TRACE && process.env.GIT_TRACE.length > 0 && atomTmp.length > 0;
const workdirPath = process.env.ATOM_GITHUB_WORKDIR_PATH;
const pinentryPath = process.env.ATOM_GITHUB_PINENTRY_PATH;
const inSpecMode = process.env.ATOM_GITHUB_SPEC_MODE === 'true';

const DEFAULT_GPG = 'gpg';
const ORIGINAL_GPG_HOME = process.env.GNUPGHOME || path.join(os.homedir(), '.gnupg');
const GPG_TMP_HOME = path.join(atomTmp, 'gpg-home');

let logStream = null;

/*
 * Emit diagnostic messages to stderr if GIT_TRACE is set to a non-empty value.
 */
function log(message, raw = false) {
  if (!diagnosticsEnabled) {
    return;
  }

  if (!logStream) {
    const logFile = path.join(process.env.ATOM_GITHUB_TMP, 'gpg-wrapper.log');
    logStream = fs.createWriteStream(logFile, {defaultEncoding: true});
  }

  if (!raw) {
    logStream.write(`gpg-wrapper: ${message}\n`);
  } else {
    logStream.write(message);
  }
}

/*
 * Discover a GPG program configured in the --system git status, if any.
 */
function getSystemGpgProgram() {
  if (inSpecMode) {
    // Skip system configuration in spec mode to maintain reproduceability across systems.
    return Promise.resolve(DEFAULT_GPG);
  }
  const env = {
    GIT_CONFIG_PARAMETERS: '',
    PATH: process.env.ATOM_GITHUB_ORIGINAL_PATH || '',
  };

  return new Promise(resolve => {
    execFile('git', ['config', '--system', 'gpg.program'], {env}, (error, stdout, stderr) => {
      if (error) {
        log('No system GPG program. this is ok');
        resolve(DEFAULT_GPG);
        return;
      }

      const systemGpgProgram = stdout !== '' ? stdout : DEFAULT_GPG;

      log(`Discovered system GPG program: ${systemGpgProgram}`);
      resolve(systemGpgProgram);
    });
  });
}

/*
 * Discover the real GPG program that git is configured to use.
 */
function getGpgProgram() {
  const env = {GIT_CONFIG_PARAMETERS: ''};
  return GitProcess.exec(['config', 'gpg.program'], workdirPath, {env})
  .then(({stdout}) => {
    if (stdout !== '') {
      log(`Discovered gpg program ${stdout}.`);
      return stdout;
    } else {
      return getSystemGpgProgram();
    }
  });
}

/*
 * Launch a temporary GPG agent with an independent --homedir and a --pinentry-program that's overridden to use our
 * Atom-backed gpg-pinentry.sh.
 */
function createIsolatedGpgHome() {
  log(`Creating an isolated GPG home ${GPG_TMP_HOME}`);
  return new Promise((resolve, reject) => {
    fs.mkdir(GPG_TMP_HOME, 0o700, err => (err ? reject(err) : resolve()));
  })
  .then(() => copyGpgHome());
}

function copyGpgHome() {
  log(`Copying GPG home from ${ORIGINAL_GPG_HOME} to ${GPG_TMP_HOME}.`);

  function copyGpgEntry(subpath, entry) {
    return new Promise((resolve, reject) => {
      const fullPath = path.join(ORIGINAL_GPG_HOME, subpath, entry);
      const destPath = path.join(GPG_TMP_HOME, subpath, entry);
      fs.lstat(fullPath, (err, stats) => {
        if (err) {
          reject(err);
          return;
        }

        if (stats.isFile()) {
          const rd = fs.createReadStream(fullPath);
          rd.on('error', reject);

          const wd = fs.createWriteStream(destPath);
          wd.on('error', reject);
          wd.on('close', resolve);

          rd.pipe(wd);
        } else if (stats.isDirectory()) {
          const subdir = path.join(subpath, entry);
          // eslint-disable-next-line no-shadow
          fs.mkdir(destPath, 0o700, err => {
            if (err) {
              reject(err);
              return;
            }

            copyGpgDirectory(subdir).then(resolve);
          });
        } else {
          resolve();
        }
      });
    });
  }

  function copyGpgDirectory(subpath) {
    return new Promise((resolve, reject) => {
      const dirPath = path.join(ORIGINAL_GPG_HOME, subpath);
      fs.readdir(dirPath, (err, contents) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(Promise.all(contents.map(entry => copyGpgEntry(subpath, entry))));
      });
    });
  }

  return copyGpgDirectory('');
}

function startIsolatedAgent() {
  log(`Starting an isolated GPG agent in ${GPG_TMP_HOME}.`);

  return new Promise((resolve, reject) => {
    const args = [
      '--daemon',
      '--verbose',
      '--homedir', GPG_TMP_HOME,
      '--pinentry-program', pinentryPath,
    ];

    const env = {
      PATH: process.env.PATH,
      GIT_ASKPASS: process.env.GIT_ASKPASS,
      ATOM_GITHUB_ELECTRON_PATH: process.env.ATOM_GITHUB_ELECTRON_PATH,
      ATOM_GITHUB_ASKPASS_PATH: process.env.ATOM_GITHUB_ASKPASS_PATH,
      ATOM_GITHUB_SOCK_PATH: process.env.ATOM_GITHUB_SOCK_PATH,
      GNUPGHOME: GPG_TMP_HOME,
    };

    let stdout = '';
    let stderr = '';
    let done = false;
    const agentEnv = {
      GPG_AGENT_INFO: '',
    };

    // TODO ensure that the gpg-agent corresponds to the gpg binary
    // TODO allow explicit gpg-agent specification just in case
    log(`Spawning gpg-agent with ${args.join(' ')}`);
    const agent = spawn('gpg-agent', args, {
      env, stdio: ['ignore', 'pipe', 'pipe'],
    });

    agent.on('error', err => {
      log(`gpg-agent failed to launch: ${err}`);
      // TODO attempt 1.4.x mode here

      if (!done) {
        done = true;
        reject(err);
      }
    });

    agent.on('exit', (code, signal) => {
      if (code !== null && code !== 0) {
        reject(new Error(`gpg-agent exited with status ${code}.`));
        return;
      } else if (signal !== null) {
        reject(new Error(`gpg-agent was terminated with signal ${signal}.`));
        return;
      } else {
        log('gpg-agent launched successfully.');
      }

      if (!done) {
        done = true;

        // Parse GPG_AGENT_INFO from stdout.
        const match = /GPG_AGENT_INFO=([^;\s]+)/.exec(stdout);
        if (match) {
          log(`Acquired agent info ${match[1]}.`);
          agentEnv.GPG_AGENT_INFO = match[1];
        }

        resolve(agentEnv);
      }
    });

    agent.stdout.setEncoding('utf8');
    agent.stdout.on('data', chunk => (stdout += chunk));

    agent.stderr.setEncoding('utf8');
    agent.stderr.on('data', chunk => (stderr += chunk));
  });
}

/*
 * Read all information written to this process' stdin.
 */
function getStdin() {
  return new Promise((resolve, reject) => {
    let stdin = '';

    process.stdin.setEncoding('utf8');

    process.stdin.on('data', chunk => {
      stdin += chunk;
    });

    process.stdin.on('end', () => resolve(stdin));
    process.stdin.on('error', reject);
  });
}

function runGpgProgram(gpgProgram, gpgHome, gpgStdin, agentEnv) {
  const gpgArgs = [
    '--batch', '--no-tty', '--yes', '--homedir', gpgHome,
  ].concat(process.argv.slice(2));

  log(`Executing ${gpgProgram} ${gpgArgs.join(' ')}.`);

  return new Promise((resolve, reject) => {
    const env = agentEnv;
    if (!env.PATH) { env.PATH = process.env.PATH; }
    if (!env.GPG_AGENT_INFO) { env.GPG_AGENT_INFO = process.env.GPG_AGENT_INFO || ''; }
    if (!env.GNUPGHOME) { env.GNUPGHOME = gpgHome; }

    let stdout = '';
    let stderr = '';
    let done = false;

    const gpg = spawn(gpgProgram, gpgArgs, {env});

    gpg.stderr.on('data', chunk => {
      log(chunk, true);
      stderr += chunk;
    });

    gpg.stdout.on('data', chunk => {
      log(chunk, true);
      stdout += chunk;
    });

    gpg.on('error', err => {
      if (!done) {
        reject(err);
        done = true;
      }
    });

    gpg.on('exit', (code, signal) => {
      let errorMessage = null;

      if (code !== 0 && code !== null) {
        errorMessage = `gpg process exited abnormally with code ${code}.`;
      } else if (signal !== null) {
        errorMessage = `gpg process terminated with signal ${signal}.`;
      }

      if (errorMessage && done) {
        log(errorMessage);
      } else if (errorMessage && !done) {
        const err = new Error(errorMessage);
        err.stderr = stderr;
        err.stdout = stdout;
        err.code = code;
        err.signal = signal;

        done = true;
        reject(err);
      } else if (!errorMessage && done) {
        log('gpg process terminated normally.');
      } else if (!errorMessage && !done) {
        // Success. Propagate stdout, stderr, and the exit status to the calling process.
        process.stderr.write(stderr);
        process.stdout.write(stdout);

        done = true;
        resolve(code);
      }
    });

    gpg.stdin.end(gpgStdin);
  });
}

function cleanup(exitCode) {
  if (logStream) {
    return new Promise(resolve => {
      logStream.end('\n', 'utf8', () => process.exit(exitCode));
    });
  } else {
    process.exit(exitCode);
    return Promise.resolve();
  }
}

Promise.all([
  getGpgProgram(),
  getStdin(),
]).then(([gpgProgram, gpgStdin]) => {
  log('Attempting to execute gpg with native pinentry.');
  return runGpgProgram(gpgProgram, ORIGINAL_GPG_HOME, gpgStdin, {})
  .catch(err => {
    const killedBySignal = err.signal !== null;
    const badPassphrase = /Bad passphrase/.test(err.stderr);
    const cancelledByUser = /Operation cancelled/.test(err.stderr);

    if (killedBySignal || badPassphrase || cancelledByUser) {
      // Continue dying.
      process.stderr.write(err.stderr);
      process.stdout.write(err.stdout);
      throw err;
    }

    log('Native pinentry failed. This is ok. Attempting to execute gpg with Atom pinentry.');
    return createIsolatedGpgHome()
    .then(startIsolatedAgent)
    .then(env => runGpgProgram(gpgProgram, GPG_TMP_HOME, gpgStdin, env));
  });
})
.then(cleanup, err => {
  log(`Error:\n${err.stack}`);
  return cleanup(1);
});
