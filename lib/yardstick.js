// Measure elapsed durations from specific beginning points.

import {writeFile} from './helpers';

// A sequence of durations since a fixed
class DurationSet {
  constructor(name) {
    this.name = name;
    this.startTimestamp = performance.now();
    this.marks = [];

    // eslint-disable-next-line no-console
    console.log('%cbegin %c%s:%s',
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

const yardstick = {
  async saveTo(fileName) {
    const payload = JSON.stringify(durationSets.map(set => set.serialize()));
    await writeFile(fileName, payload);
    durationSets = [];
  },
};

[
  'stageFile', 'stageHunk', 'stageLine',
  'unstageFile', 'unstageHunk', 'unstageLine',
].forEach(opName => {
  yardstick[opName] = function() {
    const ds = new DurationSet(opName);
    durationSets.push(ds);
    return ds;
  };
});

export default yardstick;
