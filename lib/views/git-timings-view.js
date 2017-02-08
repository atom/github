import {Emitter} from 'atom';

import React from 'react';
import ReactDom from 'react-dom';

import {autobind} from 'core-decorators';

class Marker {
  constructor(label, didUpdate) {
    this.label = label;
    this.currentSection = null;
    this.timings = [];
    this.didUpdate = didUpdate;
  }

  markStart(sectionName, startTime = performance.now()) {
    if (this.currentSection) {
      this.markEnd(this.currentSection, startTime);
    }

    this.currentSection = sectionName;
    this.timings.push({label: sectionName, start: startTime});

    this.didUpdate();
  }

  markEnd(sectionName, endTime = performance.now()) {
    if (!sectionName && this.currentSection) {
      this.timings.find(t => t.label === this.currentSection).end = endTime;
    } else {
      this.timings.find(t => t.label === sectionName).end = endTime;
    }

    if (this.currentSection === sectionName) {
      this.currentSection = null;
    }

    this.didUpdate();
  }

  getTimings() {
    return this.timings;
  }
}

const markers = [];
export default class GitTimingsView extends React.Component {
  static emitter = new Emitter();

  static createPaneItem() {
    return {
      serialize() { return {deserializer: 'GitTimingsView'}; },
      getURI() { return 'atom-github://debug/timings'; },
      getTitle() { return 'GitHub Package Timings View'; },
      get element() {
        const div = document.createElement('div');
        ReactDom.render(<GitTimingsView />, div);
        return div;
      },
    };
  }

  static deserialize() {
    return this.createPaneItem();
  }

  static generateMarker(label) {
    const marker = new Marker(label, () => {
      GitTimingsView.emitter.emit('did-update');
    });
    markers.unshift(marker);
    GitTimingsView.emitter.emit('did-update');
    return marker;
  }

  static onDidUpdate(callback) {
    return GitTimingsView.emitter.on('did-update', callback);
  }

  componentDidMount() {
    this.subscription = GitTimingsView.onDidUpdate(() => this.forceUpdate());
  }

  componentWillUnmount() {
    this.subscription.dispose();
  }

  render() {
    return (
      <div className="github-GitTimingsView">
        <button onClick={this.handleAddSpacer}>
          Add Spacer
        </button>
        <table>
          <thead>
            <tr>
              <th>Command</th>
              <th>Enqueued At</th>
              <th>Queue</th>
              <th>Prepare</th>
              <th>Execute</th>
            </tr>
          </thead>
          <tbody>
            {markers.map(this.renderMarker)}
          </tbody>
        </table>
      </div>
    );
  }

  @autobind
  handleAddSpacer(e) {
    e.preventDefault();
    GitTimingsView.generateMarker('<spacer>');
  }

  @autobind
  renderMarker(marker, idx) {
    return (
      <tr key={idx}>
        <td>{marker.label}</td>
        <td>{this.getStartTime(marker, 'queued')}</td>
        <td>{this.renderTime(marker, 'queued')}</td>
        <td>{this.renderTime(marker, 'prepare')}</td>
        <td>{this.renderTime(marker, 'execute')}</td>
      </tr>
    );
  }

  getStartTime(marker, section) {
    const timings = marker.getTimings();
    const timing = timings.find(t => t.label === section);
    if (timing) {
      return Math.round(timing.start * 1000) / 1000;
    } else {
      return 'n/a';
    }
  }

  renderTime(marker, section) {
    const timings = marker.getTimings();
    const timing = timings.find(t => t.label === section);
    if (timing) {
      const ms = timing.end - timing.start;
      const display = Math.round(ms * 1000) / 1000;
      return `${display}ms`;
    } else {
      return 'n/a';
    }
  }
}

atom.deserializers.add(GitTimingsView);
