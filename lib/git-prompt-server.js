import net from 'net';
import {Emitter} from 'event-kit';

export default class GitPromptServer {
  constructor(gitTempDir) {
    this.emitter = new Emitter();
    this.gitTempDir = gitTempDir;
  }

  async start(promptForInput) {
    this.promptForInput = promptForInput;

    await this.gitTempDir.ensure();
    this.server = await this.startListening(this.gitTempDir.getSocketPath());
  }

  startListening(socketPath) {
    return new Promise(resolve => {
      const server = net.createServer(connection => {
        connection.setEncoding('utf8');

        const parts = [];

        connection.on('data', data => {
          const nullIndex = data.indexOf('\u0000');
          if (nullIndex === -1) {
            parts.push(data);
          } else {
            parts.push(data.substring(0, nullIndex));
            this.handleData(connection, parts.join(''));
          }
        });
      });

      server.listen(socketPath, () => resolve(server));
    });
  }

  handleData(connection, data) {
    let query;
    try {
      query = JSON.parse(data);
    } catch (e) {
      this.emitter.emit('did-cancel');
    }

    Promise.resolve(this.promptForInput(query))
      .then(answer => connection.end(JSON.stringify(answer), 'utf-8'))
      .catch(() => this.emitter.emit('did-cancel', {handlerPid: query.pid}));
  }

  onDidCancel(cb) {
    return this.emitter.on('did-cancel', cb);
  }

  async terminate() {
    await new Promise(resolve => this.server.close(resolve));
    this.emitter.dispose();
  }
}
