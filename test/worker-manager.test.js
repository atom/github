import sinon from 'sinon';

import WorkerManager, {Operation} from '../lib/worker-manager';

describe('WorkerManager', function() {
  describe('when a worker process crashes', function() {
    it('creates a new worker process (with the same operation count limit) and executes remaining operations', async function() {
      const workerManager = WorkerManager.getInstance();
      workerManager.createNewWorker({operationCountLimit: 40});
      sinon.stub(Operation.prototype, 'complete');

      const worker1 = workerManager.getActiveWorker();
      await worker1.getReadyPromise();
      workerManager.request();
      workerManager.request();
      workerManager.request();
      const worker1OperationsInFlight = worker1.getRemainingOperations();
      assert.equal(worker1OperationsInFlight.length, 3);

      const worker1Pid = worker1.getPid();
      process.kill(worker1Pid, 'SIGKILL');

      await assert.async.notEqual(worker1, workerManager.getActiveWorker());
      const worker2 = workerManager.getActiveWorker();
      await worker2.getReadyPromise();
      assert.notEqual(worker2.getPid(), worker1Pid);
      assert.equal(worker2.getOperationCountLimit(), worker1.getOperationCountLimit());
      assert.deepEqual(worker2.getRemainingOperations(), worker1OperationsInFlight);
    });
  });
});
