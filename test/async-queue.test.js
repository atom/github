import AsyncQueue from '../lib/async-queue';

const timer = n => {
  return new Promise(resolve => {
    setTimeout(resolve, 10 - n);
  });
};

describe('AsyncQueue', () => {
  it('runs items in the order queued', async () => {
    const queue = new AsyncQueue();

    const expectedEvents = [];
    const actualEvents = [];
    const promises = [];
    for (let i = 0; i < 10; i++) {
      expectedEvents.push(i);
      const promise = queue.push(() => timer(i)).then(() => actualEvents.push(i));
      promises.push(promise);
    }

    await Promise.all(promises);
    assert.deepEqual(expectedEvents, actualEvents);
  });

  it('continues running queued items when one fails', async () => {
    const queue = new AsyncQueue();

    const expectedEvents = [];
    const actualEvents = [];
    const promises = [];
    for (let i = 0; i < 10; i++) {
      expectedEvents.push(i === 5 ? 'error' : i);
      const promise = queue.push(() => {
        if (i === 5) {
          throw new Error('omg');
        } else {
          return timer(i);
        }
      }).then(() => actualEvents.push(i), () => actualEvents.push('error'));
      promises.push(promise);
    }

    await Promise.all(promises);
    assert.deepEqual(expectedEvents, actualEvents);
  });
});
