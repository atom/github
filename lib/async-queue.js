class Task {
  constructor(fn, parallel = true) {
    this.fn = fn;
    this.parallel = parallel;
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }

  execute() {
    return this.fn.call(undefined).then(this.resolve, this.reject);
  }

  runsInParallel() {
    return this.parallel;
  }

  getPromise() {
    return this.promise;
  }
}

export default class AsyncQueue {
  constructor(options = {}) {
    this.parallelism = options.parallelism || 1;
    this.nonParallelizableOperation = false;
    this.threadsInUse = 0;
    this.queue = [];
  }

  push(fn, {parallel} = {parallel: true}) {
    const task = new Task(fn, parallel);
    this.queue.push(task);
    this.processQueue();
    return task.getPromise();
  }

  processQueue() {
    if (!this.queue.length || this.nonParallelizableOperation) { return; }

    const task = this.queue[0];
    const canRunParallelOp = task.runsInParallel() && this.threadsInUse < this.parallelism;
    const canRunSerialOp = !task.runsInParallel() && this.threadsInUse === 0;
    if (canRunSerialOp || canRunParallelOp) {
      this.processTask(task, task.runsInParallel());
      this.queue.shift();
      this.processQueue();
    }
  }

  async processTask(task, runsInParallel) {
    this.threadsInUse++;
    if (!runsInParallel) {
      this.nonParallelizableOperation = true;
    }

    try {
      await task.execute();
    } catch (err) {
      // nothing
    } finally {
      this.threadsInUse--;
      this.nonParallelizableOperation = false;
      this.processQueue();
    }
  }
}
