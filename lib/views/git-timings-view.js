import {Emitter, CompositeDisposable} from 'atom';

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
let updateTimer = null;
export default class GitTimingsView extends React.Component {
  static propTypes = {
    container: React.PropTypes.any.isRequired,
  }

  static emitter = new Emitter();

  static createPaneItem() {
    let element;
    return {
      serialize() { return {deserializer: 'GitTimingsView'}; },
      getURI() { return 'atom-github://debug/timings'; },
      getTitle() { return 'GitHub Package Timings View'; },
      get element() {
        if (!element) {
          element = document.createElement('div');
          ReactDom.render(<GitTimingsView container={element} />, element);
        }
        return element;
      },
    };
  }

  static deserialize() {
    return this.createPaneItem();
  }

  static generateMarker(label) {
    const marker = new Marker(label, () => {
      GitTimingsView.scheduleUpdate();
    });
    markers.unshift(marker);
    GitTimingsView.scheduleUpdate();
    return marker;
  }

  static scheduleUpdate() {
    if (updateTimer) {
      clearTimeout(updateTimer);
    }

    updateTimer = setTimeout(() => {
      GitTimingsView.emitter.emit('did-update');
    }, 1000);
  }

  static onDidUpdate(callback) {
    return GitTimingsView.emitter.on('did-update', callback);
  }

  componentDidMount() {
    this.subscriptions = new CompositeDisposable(
      GitTimingsView.onDidUpdate(() => this.forceUpdate()),
      atom.workspace.onDidDestroyPaneItem(({item}) => {
        if (item.element === this.props.container) {
          // we just got closed
          ReactDom.unmountComponentAtNode(this.props.container);
        }
      }),
    );
  }

  componentWillUnmount() {
    this.subscriptions.dispose();
  }

  render() {
    return (
      <div className="github-GitTimingsView">
        <div className="github-GitTimingsView-header">
          <button className="btn" onClick={this.handleAddSpacer}>
            Add Spacer
          </button>
        </div>
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
    GitTimingsView.generateMarker('👾');
  }

  @autobind
  renderMarker(marker, idx) {
    return (
      <tr key={markers.length - idx}>
        <td>{marker.label}</td>
        <td>{this.getStartTime(marker, 'queued')}</td>
        <td>{this.getElapsedTime(marker, 'queued')}</td>
        <td>{this.getElapsedTime(marker, 'prepare')}</td>
        <td>{this.getElapsedTime(marker, 'execute')}</td>
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

  getElapsedTime(marker, section) {
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
