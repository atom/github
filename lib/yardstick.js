// Measure elapsed durations from specific beginning points.

import fs from 'fs-extra';
import path from 'path';
import {writeFile} from './helpers';

// A sequence of durations since a fixed beginning point
class DurationSet {
  constructor(name) {
    this.name = name;
    this.startTimestamp = performance.now();
    this.marks = [];

    if (atom.config.get('github.performanceToConsole')) {
      // eslint-disable-next-line no-console
      console.log('%cbegin %c%s:begin',
        'font-weight: bold',
        'font-weight: normal; font-style: italic; color: blue', this.name);
    }

    if (atom.config.get('github.performanceToProfile')) {
      // eslint-disable-next-line no-console
      console.profile(this.name);
    }
  }

  mark(eventName) {
    const duration = performance.now() - this.startTimestamp;

    if (atom.config.get('github.performanceToConsole')) {
      // eslint-disable-next-line no-console
      console.log('%cmark %c%s:%s %c%dms',
        'font-weight: bold',
        'font-weight: normal; font-style: italic; color: blue', this.name, eventName,
        'font-style: normal; color: black', duration);
    }

    if (atom.config.get('performanceToDirectory')) {
      this.marks.push({eventName, duration});
    }
  }

  finish() {
    this.mark('finish');

    if (atom.config.get('github.performanceToProfile')) {
      // eslint-disable-next-line no-console
      console.profileEnd(this.name);
    }
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

function shouldCapture(seriesName, eventName) {
  const anyActive = ['Console', 'Directory', 'Profile'].some(kind => {
    const value = atom.config.get(`github.performanceTo${kind}`);
    return value !== '' && value !== false;
  });
  if (!anyActive) {
    return false;
  }

  const mask = new RegExp(atom.config.get('github.performanceMask'));
  if (!mask.test(`${seriesName}:${eventName}`)) {
    return false;
  }

  return true;
}

const yardstick = {
  async save() {
    const destDir = atom.config.get('github.performanceToDirectory');
    if (destDir === '') {
      return;
    }
    const fileName = path.join(destDir, `performance-${Date.now()}.json`);

    await new Promise((resolve, reject) => {
      fs.ensureDir(destDir, err => (err ? reject(err) : resolve()));
    });

    const payload = JSON.stringify(durationSets.map(set => set.serialize()));
    await writeFile(fileName, payload);

    if (atom.config.get('github.performanceToConsole')) {
      // eslint-disable-next-line no-console
      console.log('%saved %c%d series to %s',
        'font-weight: bold',
        'font-weight: normal; color: black', durationSets.length, fileName);
    }

    durationSets = [];
  },

  begin(seriesName) {
    if (!shouldCapture(seriesName, 'begin')) {
      return;
    }

    const ds = new DurationSet(seriesName);
    activeSets.set(seriesName, ds);
  },

  mark(seriesName, eventName) {
    if (!shouldCapture(seriesName, eventName)) {
      return;
    }

    const ds = activeSets.get(seriesName);
    if (ds === undefined) {
      return;
    }
    ds.mark(eventName);
  },

  finish(seriesName) {
    if (!shouldCapture(seriesName, 'finish')) {
      return;
    }

    const ds = activeSets.get(seriesName);
    if (ds === undefined) {
      return;
    }
    ds.finish();

    durationSets.push(ds);
    activeSets.delete(seriesName);
  },
};

export default yardstick;
