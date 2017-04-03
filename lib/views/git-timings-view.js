import {Emitter, CompositeDisposable} from 'atom';
import {remote} from 'electron';
const {dialog} = remote;

import React from 'react';
import ReactDom from 'react-dom';
import {autobind} from 'core-decorators';

import {readFile} from '../helpers';
import Marker from './timing/marker';
import WaterfallWidget from './timing/waterfall-widget';

let markers = null;
let groupId = 0;
const groups = [];
let lastMarkerTime = null;
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
      getURI() { return 'atom-github://debug/markers'; },
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
    GitTimingsView.scheduleUpdate();
    return marker;
  }

  static restoreGroup(group) {
    groupId++;
    groups.unshift({id: groupId, markers: group});
    GitTimingsView.scheduleUpdate(true);
  }

  static scheduleUpdate(immediate = false) {
    if (updateTimer) {
      clearTimeout(updateTimer);
    }

    updateTimer = setTimeout(() => {
      GitTimingsView.emitter.emit('did-update');
    }, immediate ? 0 : 1000);
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
        GitTimingsView.restoreGroup(restoredMarkers);
      } catch (_err) {
        atom.notifications.addError(`Could not import timings from ${filename}`);
      }
    });
  }
}

atom.deserializers.add(GitTimingsView);
