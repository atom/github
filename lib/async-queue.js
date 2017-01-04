export default class AsyncQueue {
  constructor() {
    this.commandQueue = [];
    this.running = false;
  }

  push(fn) {
    const p = new Promise((resolve, reject) => this.commandQueue.push({fn, resolve, reject}));
    if (!this.running) { this.processQueue(); }
    return p;
  }

  async processQueue() {
    this.running = true;
    let lastPromise = Promise.resolve();
    while (this.commandQueue.length) {
      const {fn, resolve, reject} = this.commandQueue[0];
      const run = () => fn();
      lastPromise = lastPromise.then(run, run);
      lastPromise.then(resolve, reject);
      try {
        await lastPromise; // eslint-disable-line babel/no-await-in-loop
      } catch (e) { /* nothing */ }
      this.commandQueue.shift();
    }
    this.running = false;
  }
}
