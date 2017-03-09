const net = require('net');
const readline = require('readline');
const url = require('url');

const sockPath = process.argv[2];
const action = process.argv[3];

function dialog(query) {
  if (query.username) {
    query.auth = query.username;
  }
  const prompt = 'Please enter your credentials for ' + url.format(query);
  const includeUsername = !query.username;

  const payload = {prompt, includeUsername};

  return new Promise((resolve, reject) => {
    const socket = net.connect({path: sockPath, allowHalfOpen: true}, () => {
      const parts = [];

      socket.on('data', data => parts.push(data));
      socket.on('end', () => {
        try {
          const replyDocument = JSON.parse(parts.join());
          resolve(replyDocument);
        } catch (e) {
          reject(e);
        }
      });

      socket.end(JSON.stringify(payload), 'utf8');
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
    dialog(query).then(reply => {
      ['protocol', 'host', 'username', 'password'].forEach(k => {
        const value = reply[k] !== undefined ? reply[k] : query[k];
        process.stdout.write(`${k}=${value}\n`);
      });
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
