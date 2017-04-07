import React from 'react';
import {autobind} from 'core-decorators';
import {Emitter} from 'atom';
import {remote} from 'electron';
const {dialog} = remote;

import {readFile} from '../../helpers';
import Marker from './marker';
import WaterfallWidget from './waterfall-widget';

let markers = null;
let groupId = 0;
const groups = [];
let lastMarkerTime = null;
let updateTimer = null;

export default class WaterfallTab extends React.Component {
  static emitter = new Emitter();

  static generateMarker(label) {
    const marker = new Marker(label, () => {
      WaterfallTab.scheduleUpdate();
    });
    const now = performance.now();
    if (!markers || (lastMarkerTime && Math.abs(now - lastMarkerTime) >= 5000)) {
      groupId++;
      markers = [];
      groups.unshift({id: groupId, markers});
      if (groups.length > 100) {
        groups.pop();
      }
    }
    lastMarkerTime = now;
    markers.push(marker);
    WaterfallTab.scheduleUpdate();
    return marker;
  }

  static restoreGroup(group) {
    groupId++;
    groups.unshift({id: groupId, markers: group});
    WaterfallTab.scheduleUpdate(true);
  }

  static scheduleUpdate(immediate = false) {
    if (updateTimer) {
      clearTimeout(updateTimer);
    }

    updateTimer = setTimeout(() => {
      WaterfallTab.emitter.emit('did-update');
    }, immediate ? 0 : 1000);
  }

  static onDidUpdate(callback) {
    return WaterfallTab.emitter.on('did-update', callback);
  }

  componentDidMount() {
    this.subscriptions = WaterfallTab.onDidUpdate(() => this.forceUpdate());
  }

  componentWillUnmount() {
    this.subscriptions.dispose();
  }

  render() {
    return (
      <div className="github-GitTimingsView">
        <div className="github-GitTimingsView-header">
          <button className="import-button btn" onClick={this.handleImportClick}>Import</button>
        </div>
        {groups.map((group, idx) => (
          <WaterfallWidget key={group.id} markers={group.markers} />
        ))}
      </div>
    );
  }

  @autobind
  handleImportClick(e) {
    e.preventDefault();
    dialog.showOpenDialog({
      properties: ['openFile'],
    }, async filenames => {
      if (!filenames) { return; }
      const filename = filenames[0];
      try {
        const contents = await readFile(filename);
        const data = JSON.parse(contents);
        const restoredMarkers = data.map(item => Marker.deserialize(item));
        WaterfallTab.restoreGroup(restoredMarkers);
      } catch (_err) {
        atom.notifications.addError(`Could not import timings from ${filename}`);
      }
    });
  }
}
