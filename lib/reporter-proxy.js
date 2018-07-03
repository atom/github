// this class allows us to call reporter methods
// before the reporter is actually loaded, since we don't want to
// assume that the metrics package will load before the GitHub package.

// maybe this should be an object instead of a class.
// IDK.
class ReporterProxy {
  constructor() {
    this.reporter = null;
    this.events = [];
    this.timings = [];
    this.counters = [];
  }

  // function that is called after the reporter is actually loaded, to
  // set the reporter and send anydata that have accumulated while it was loading.
  setReporter(reporter) {
    this.reporter = reporter;

    this.events.forEach((customEvent) => {
      this.reporter.addCustomEvent(...customEvent);
    });

    this.timings.forEach((timing) => {
      this.reporter.addTiming(...timing);
    });

    this.counters.forEach((counterName) => {
      this.reporter.incrementCounter(counterName);
    });
  }
}

export const reporterProxy = new ReporterProxy();

export const incrementCounter = function(counterName) {
  if (reporterProxy.reporter) {
    reporterProxy.reporter.incrementCounter(counterName);
  }
  else {
    reporterProxy.counters.push(counterName);
  }
}

export const addTiming = function(eventType, durationInMilliseconds, metadata = {}) {
  if (reporterProxy.reporter) {
    reporterProxy.reporter.addTiming(eventType, durationInMilliseconds, metadata);
  } else {
    reporterProxy.timings.push({ eventType, durationInMilliseconds, metadata});
  }
}

export const addEvent = function(eventType, event) {
  if (reporterProxy.reporter) {
    reporterProxy.reporter.addCustomEvent(eventType, event);
  } else {
    reporterProxy.events.push({ eventType, event });
  }
}
