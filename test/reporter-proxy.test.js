import {addEvent, addTiming, incrementCounter, reporterProxy} from '../lib/reporter-proxy';
const pjson = require('../package.json');

const version = pjson.version;

describe('reporterProxy', function() {
  describe('before reporter has been set', function() {
    it('adds event to queue when addEvent is called', function() {
      const event = {coAuthorCount: 2};
      const eventType = 'commits';
      const expectedEvent = { eventType, event };
      addEvent(eventType, event);

      const events = reporterProxy.events;
      assert.deepEqual(events.length, 1);
      const actualEvent = events[0]
      assert.deepEqual(actualEvent.eventType, eventType);
      assert.deepEqual(actualEvent.event, { coAuthorCount: 2, gitHubPackageVersion: version});
    });

    it('adds timing to queue when addTiming is called', function() {
      const eventType = 'load';
      const durationInMilliseconds = 42;
      addTiming(eventType, durationInMilliseconds);

      const timings = reporterProxy.timings;
      assert.deepEqual(timings.length, 1);
      const timing = timings[0];
      assert.deepEqual(timing.eventType, eventType);
      assert.deepEqual(timing.durationInMilliseconds, durationInMilliseconds);
      console.log(timing.metadata);
      assert.deepEqual(timing.metadata, { gitHubPackageVersion: version });
    })

    it('adds counter to queue when incrementCounter is called', function() {
      const counterName = "commits";
      incrementCounter(counterName);

      const counters = reporterProxy.counters;
      assert.deepEqual(counters.length, 1);
      assert.deepEqual(counters[0], counterName);
    });
  });
});
