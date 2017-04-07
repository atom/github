import React from 'react';
import {autobind} from 'core-decorators';
import {TextBuffer} from 'atom';
import {remote} from 'electron';
const {dialog} = remote;

import Octicon from '../octicon';
import Waterfall from './waterfall';
import Marker from './marker';

export default class WaterfallWidget extends React.Component {
  static propTypes = {
    markers: React.PropTypes.arrayOf(React.PropTypes.instanceOf(Marker)).isRequired,
  }

  constructor(props, context) {
    super(props, context);
    this.state = {
      zoomFactor: 0.3,
      collapsed: false,
    };
  }

  render() {
    const {markers} = this.props;
    const firstMarker = markers[0];
    const lastMarker = markers[markers.length - 1];

    const startTime = firstMarker.getStart();
    const endTime = lastMarker.getEnd();
    const duration = endTime - startTime;

    return (
      <div className="waterfall-widget inset-pannel">
        <div className="waterfall-header">
          <div className="waterfall-header-text">
            <span onClick={this.handleCollapseClick} className="collapse-toggle">
              {this.state.collapsed ? '\u25b6' : '\u25bc'}
            </span>
            {this.props.markers.length} event(s) over {Math.floor(duration)}ms
          </div>
          <div className="waterfall-header-controls">
            <button
              className="waterfall-export-button btn btn-sm"
              onClick={this.handleExportClick}>Export</button>
            <Octicon icon="search" />
            <input
              type="range"
              className="input-range"
              min={0.1}
              max={1}
              step={0.01}
              value={this.state.zoomFactor}
              onChange={this.handleZoomFactorChange}
            />
          </div>
        </div>
        {this.state.collapsed ? null : <Waterfall markers={this.props.markers} zoomFactor={this.state.zoomFactor} />}
      </div>
    );
  }

  @autobind
  handleZoomFactorChange(e) {
    this.setState({zoomFactor: parseFloat(e.target.value)});
  }

  @autobind
  handleCollapseClick(e) {
    this.setState(s => ({collapsed: !s.collapsed}));
  }

  @autobind
  handleExportClick(e) {
    e.preventDefault();
    const json = JSON.stringify(this.props.markers.map(m => m.serialize()), null, '  ');
    const buffer = new TextBuffer({text: json});
    dialog.showSaveDialog({
      defaultPath: 'git-timings.json',
    }, filename => {
      if (!filename) { return; }
      buffer.saveAs(filename);
    });
  }
}
