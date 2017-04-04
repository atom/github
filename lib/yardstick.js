// Measure elapsed durations from specific beginning points.

import {writeFile} from './helpers';

// A sequence of durations since a fixed
class DurationSet {
  constructor(name) {
    this.name = name;
    this.startTimestamp = performance.now();
    this.marks = [];

    // eslint-disable-next-line no-console
    console.log('%cbegin %c%s',
      'font-weight: bold',
      'font-weight: normal; font-style: italic; color: blue', this.name);
  }

  mark(eventName) {
    const duration = performance.now() - this.startTimestamp;

    // eslint-disable-next-line no-console
    console.log('%cmark %c%s:%s %c%dms',
      'font-weight: bold',
      'font-weight: normal; font-style: italic; color: blue', this.name, eventName,
      'font-style: normal; color: black', duration);

    this.marks.push({eventName, duration});
  }

  serialize() {
    return {
      name: this.name,
      markers: this.marks,
    };
  }
}

let durationSets = [];
const activeSets = new Map();

const yardstick = {
  async saveTo(fileName) {
    const payload = JSON.stringify(durationSets.map(set => set.serialize()));
    await writeFile(fileName, payload);
    durationSets = [];
  },

  begin(seriesName) {
    const ds = new DurationSet(seriesName);
    durationSets.push(ds);
    activeSets.set(seriesName, ds);
  },

  mark(seriesName, eventName) {
    const ds = activeSets.get(seriesName);
    if (ds === undefined) {
      return;
    }
    ds.mark(eventName);
  },
};

export default yardstick;
