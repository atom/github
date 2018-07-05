import {addEvent, addTiming, incrementCounter, reporterProxy} from '../lib/reporter-proxy';
const pjson = require('../package.json');

const version = pjson.version;

class FakeReporter {
  addCustomEvent() {}

  addTiming() {}

  incrementCounter() {}
}

const fakeReporter = new FakeReporter();

describe('reporterProxy', function() {
  const event = {coAuthorCount: 2};
  const eventType = 'commits';

  const timingEventType = 'load';
  const durationInMilliseconds = 42;

  const counterName = 'push';
  afterEach(function() {
    // let's not leak state between tests, dawg.
    reporterProxy.events = [];
    reporterProxy.timings = [];
    reporterProxy.counters = [];
  });

  describe('before reporter has been set', function() {
    it('adds event to queue when addEvent is called', function() {
      addEvent(eventType, event);

      const events = reporterProxy.events;
      assert.deepEqual(events.length, 1);
      const actualEvent = events[0];
      assert.deepEqual(actualEvent.eventType, eventType);
      assert.deepEqual(actualEvent.event, {coAuthorCount: 2, gitHubPackageVersion: version});
    });

    it('adds timing to queue when addTiming is called', function() {
      addTiming(timingEventType, durationInMilliseconds);

      const timings = reporterProxy.timings;
      assert.deepEqual(timings.length, 1);
      const timing = timings[0];

      assert.deepEqual(timing.eventType, timingEventType);
      assert.deepEqual(timing.durationInMilliseconds, durationInMilliseconds);
      assert.deepEqual(timing.metadata, {gitHubPackageVersion: version});
    });

    it('adds counter to queue when incrementCounter is called', function() {
      incrementCounter(counterName);

      const counters = reporterProxy.counters;
      assert.deepEqual(counters.length, 1);
      assert.deepEqual(counters[0], counterName);
    });
  });
  describe('after reporter has been set', function() {
    let addCustomEventStub, addTimingStub, incrementCounterStub;
    beforeEach(function() {
      addCustomEventStub = sinon.stub(fakeReporter, 'addCustomEvent');
      addTimingStub = sinon.stub(fakeReporter, 'addTiming');
      incrementCounterStub = sinon.stub(fakeReporter, 'incrementCounter');
    });
    it('empties all queues', function() {
      addEvent(eventType, event);
      addTiming(timingEventType, durationInMilliseconds);
      incrementCounter(counterName);

      assert.isFalse(addCustomEventStub.called);
      assert.isFalse(addTimingStub.called);
      assert.isFalse(incrementCounterStub.called);

      assert.deepEqual(reporterProxy.events.length, 1);
      assert.deepEqual(reporterProxy.timings.length, 1);
      assert.deepEqual(reporterProxy.counters.length, 1);

      reporterProxy.setReporter(fakeReporter);

      const addCustomEventArgs = addCustomEventStub.lastCall.args;
      assert.deepEqual(addCustomEventArgs[0], eventType);
      assert.deepEqual(addCustomEventArgs[1], {coAuthorCount: 2, gitHubPackageVersion: version});

      const addTimingArgs = addTimingStub.lastCall.args;
      assert.deepEqual(addTimingArgs[0], timingEventType);
      assert.deepEqual(addTimingArgs[1], durationInMilliseconds);
      assert.deepEqual(addTimingArgs[2], {gitHubPackageVersion: version});

      assert.deepEqual(incrementCounterStub.lastCall.args, [counterName]);
    });
    it('calls addCustomEvent directly, bypassing queue', function() {
      assert.isFalse(addCustomEventStub.called);
      reporterProxy.setReporter(fakeReporter);

      addEvent(eventType, event);
      assert.deepEqual(reporterProxy.events.length, 0);

      const addCustomEventArgs = addCustomEventStub.lastCall.args;
      assert.deepEqual(addCustomEventArgs[0], eventType);
      assert.deepEqual(addCustomEventArgs[1], {coAuthorCount: 2, gitHubPackageVersion: version});
    });
    it('calls addTiming directly, bypassing queue', function() {
      assert.isFalse(addTimingStub.called);
      reporterProxy.setReporter(fakeReporter);

      addTiming(timingEventType, durationInMilliseconds);
      assert.deepEqual(reporterProxy.timings.length, 0);

      const addTimingArgs = addTimingStub.lastCall.args;
      assert.deepEqual(addTimingArgs[0], timingEventType);
      assert.deepEqual(addTimingArgs[1], durationInMilliseconds);
      assert.deepEqual(addTimingArgs[2], {gitHubPackageVersion: version});
    });
    it('calls incrementCounter directly, bypassing queue', function() {
      assert.isFalse(incrementCounterStub.called);
      reporterProxy.setReporter(fakeReporter);

      incrementCounter(counterName);
      assert.deepEqual(reporterProxy.counters.length, 0);

      assert.deepEqual(incrementCounterStub.lastCall.args, [counterName]);
    });
  });
});
