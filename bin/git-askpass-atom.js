const net = require('net');

const sockPath = process.argv[2];
const prompt = process.argv[3];

process.stderr.write(`git-askpass-atom.js called: ${prompt}\n`);

const payload = {prompt, includeUsername: false};

const socket = net.connect(sockPath, () => {
  const parts = [];

  socket.on('data', data => parts.push(data));
  socket.on('end', () => {
    try {
      process.stderr.write(`About to parse:\n${parts.join()}\n`);
      const replyDocument = JSON.parse(parts.join());
      process.stdout.write(replyDocument.password);
      process.exit(0);
    } catch (err) {
      process.stderr.write(`Unable to prompt through Atom:\n${err.stack}`);
      process.exit(1);
    }
  });

  socket.write(JSON.stringify(payload) + '\u0000', 'utf8');
});
socket.setEncoding('utf8');
