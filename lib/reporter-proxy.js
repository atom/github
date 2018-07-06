const pjson = require('../package.json');

export const FIVE_MINUTES_IN_MILLISECONDS = 1000 * 60 * 5;

// this class allows us to call reporter methods
// before the reporter is actually loaded, since we don't want to
// assume that the metrics package will load before the GitHub package.
class ReporterProxy {
  constructor() {
    this.reporter = null;
    this.events = [];
    this.timings = [];
    this.counters = [];
    this.gitHubPackageVersion = pjson.version;

    // if for some reason a user disables the metrics package, we don't want to
    // just keep accumulating events in memory until the heat death of the universe.
    // Use a no-op class, clear all queues, move on with our lives.
    setTimeout(FIVE_MINUTES_IN_MILLISECONDS, () => {
      if (this.reporter === null) {
        this.setReporter(new FakeReporter());
        this.events = [];
        this.timings = [];
        this.counters = [];
      }
    });
  }

  // function that is called after the reporter is actually loaded, to
  // set the reporter and send any data that have accumulated while it was loading.
  setReporter(reporter) {
    this.reporter = reporter;

    this.events.forEach(customEvent => {
      this.reporter.addCustomEvent(customEvent.eventType, customEvent.event);
    });

    this.timings.forEach(timing => {
      this.reporter.addTiming(timing.eventType, timing.durationInMilliseconds, timing.metadata);
    });

    this.counters.forEach(counterName => {
      this.reporter.incrementCounter(counterName);
    });
  }
}

export const reporterProxy = new ReporterProxy();

export class FakeReporter {
  addCustomEvent() {}

  addTiming() {}

  incrementCounter() {}
}

export const incrementCounter = function(counterName) {
  if (reporterProxy.reporter) {
    reporterProxy.reporter.incrementCounter(counterName);
  } else {
    reporterProxy.counters.push(counterName);
  }
};

export const addTiming = function(eventType, durationInMilliseconds, metadata = {}) {
  metadata.gitHubPackageVersion = reporterProxy.gitHubPackageVersion;
  if (reporterProxy.reporter) {
    reporterProxy.reporter.addTiming(eventType, durationInMilliseconds, metadata);
  } else {
    reporterProxy.timings.push({eventType, durationInMilliseconds, metadata});
  }
};

export const addEvent = function(eventType, event) {
  event.gitHubPackageVersion = reporterProxy.gitHubPackageVersion;
  if (reporterProxy.reporter) {
    reporterProxy.reporter.addCustomEvent(eventType, event);
  } else {
    reporterProxy.events.push({eventType, event});
  }
};
