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

  describe('when a worker process is sick', function() {
    it('creates a new worker with a new operation count limit that is based on the limit and completed operation count of the last worker', function() {
      const workerManager = WorkerManager.getInstance();

      function createSickWorker(operationCountLimit, completedOperationCount) {
        const sickWorker = workerManager.getActiveWorker();
        sinon.stub(sickWorker, 'getOperationCountLimit').returns(operationCountLimit);
        sinon.stub(sickWorker, 'getCompletedOperationCount').returns(completedOperationCount);
        return sickWorker;
      }

      // when the last worker operation count limit was greater than or equal to the completed operation count
      // this means that the average spawn time for the first operationCountLimit operations was already higher than the threshold
      // the system is likely just slow, so we should increase the operationCountLimit so next time we do more operations before creating a new process
      const sickWorker1 = createSickWorker(10, 9);
      workerManager.onSick(sickWorker1);
      assert.notEqual(sickWorker1, workerManager.getActiveWorker());
      assert.equal(workerManager.getActiveWorker().getOperationCountLimit(), 20);

      const sickWorker2 = createSickWorker(50, 50);
      workerManager.onSick(sickWorker2);
      assert.notEqual(sickWorker2, workerManager.getActiveWorker());
      assert.equal(workerManager.getActiveWorker().getOperationCountLimit(), 100);

      const sickWorker3 = createSickWorker(100, 100);
      workerManager.onSick(sickWorker3);
      assert.notEqual(sickWorker3, workerManager.getActiveWorker());
      assert.equal(workerManager.getActiveWorker().getOperationCountLimit(), 100);

      // when the last worker operation count limit was less than the completed operation count
      // this means that the system is performing better and we can drop the operationCountLimit back down to the base limit
      const sickWorker4 = createSickWorker(100, 150);
      workerManager.onSick(sickWorker4);
      assert.notEqual(sickWorker4, workerManager.getActiveWorker());
      assert.equal(workerManager.getActiveWorker().getOperationCountLimit(), 10);
    });

    describe('when the sick process crashes', function() {
      it('completes remaining operations in existing active process', function() {
        const workerManager = WorkerManager.getInstance();
        const sickWorker = workerManager.getActiveWorker();

        sinon.stub(Operation.prototype, 'complete');
        workerManager.request();
        workerManager.request();
        workerManager.request();

        const operationsInFlight = sickWorker.getRemainingOperations();
        assert.equal(operationsInFlight.length, 3);

        workerManager.onSick(sickWorker);
        assert.notEqual(sickWorker, workerManager.getActiveWorker());
        const newWorker = workerManager.getActiveWorker();
        assert.equal(newWorker.getRemainingOperations(), 0);

        workerManager.onCrashed(sickWorker);
        assert.equal(workerManager.getActiveWorker(), newWorker);
        assert.equal(newWorker.getRemainingOperations().length, 3);
      });
    });
  });
});
