import {Emitter, CompositeDisposable} from 'atom';

import React from 'react';
import ReactDom from 'react-dom';

import {autobind} from 'core-decorators';

import Octicon from './octicon';

function genArray(interval, count) {
  const arr = [];
  for (let i = 1; i <= count; i++) {
    arr.push(interval * i);
  }
  return arr;
}

class Marker {
  constructor(label, didUpdate) {
    this.label = label;
    this.didUpdate = didUpdate;
    this.end = null;
    this.markers = [];
  }

  getStart() {
    return this.markers.length ? this.markers[0].start : null;
  }

  getEnd() {
    return this.end;
  }

  mark(sectionName) {
    this.markers.push({name: sectionName, start: performance.now()});
  }

  finalize() {
    this.end = performance.now();
    this.didUpdate();
  }

  getTimings() {
    return this.markers.map((timing, idx, ary) => {
      const next = ary[idx + 1];
      const end = next ? next.start : this.getEnd();
      return {...timing, end};
    });
  }
}


class MarkerTooltip extends React.Component {
  static propTypes = {
    marker: React.PropTypes.instanceOf(Marker).isRequired,
  }

  render() {
    const {marker} = this.props;
    const timings = marker.getTimings();

    return (
      <div style={{textAlign: 'left', maxWidth: 300, whiteSpace: 'initial'}}>
        <strong><tt>{marker.label}</tt></strong>
        <ul style={{paddingLeft: 20, marginTop: 10}}>
          {timings.map(({name, start, end}) => {
            const duration = end - start;
            return <li key={name}>{name}: {Math.floor(duration * 100) / 100}ms</li>;
          })}
        </ul>
      </div>
    );
  }
}

const COLORS = {
  queued: 'red',
  prepare: 'cyan',
  execute: 'green',
};
class MarkerSpan extends React.Component {
  static propTypes = {
    marker: React.PropTypes.instanceOf(Marker).isRequired,
  }

  render() {
    const {marker, ...others} = this.props;
    const timings = marker.getTimings();
    const totalTime = marker.getEnd() - marker.getStart();
    const percentages = timings.map(({name, start, end}) => {
      const duration = end - start;
      return {color: COLORS[name], percent: duration / totalTime * 100};
    });
    return (
      <span
        {...others}
        ref={c => { this.span = c; }}
        onMouseOver={this.handleMouseOver}
        onMouseOut={this.handleMouseOut}>
        {percentages.map(({color, percent}, i) => {
          const style = {
            width: `${percent}%`,
            background: color,
          };
          return <span className="waterfall-marker-section" key={i} style={style} />;
        })}
      </span>
    );
  }

  @autobind
  handleMouseOver(e) {
    const marker = this.props.marker;
    const elem = document.createElement('div');
    ReactDom.render(<MarkerTooltip marker={marker} />, elem);
    this.tooltipDisposable = atom.tooltips.add(this.span, {
      // title: this.props.marker.label,
      item: elem,
      placement: 'auto bottom',
      trigger: 'manual',
    });
  }

  @autobind
  handleMouseOut(e) {
    this.tooltipDisposable && this.tooltipDisposable.dispose();
    this.tooltipDisposable = null;
  }
}


class Waterfall extends React.Component {
  static propTypes = {
    markers: React.PropTypes.arrayOf(React.PropTypes.instanceOf(Marker)).isRequired,
    zoomFactor: React.PropTypes.number.isRequired,
  }

  constructor(props, context) {
    super(props, context);
    this.state = this.getNextState(props);
  }

  componentWillReceiveProps(nextProps) {
    this.setState(this.getNextState(nextProps));
  }

  getNextState(props) {
    const {markers} = props;
    const firstTiming = markers[0];
    const lastTiming = markers[markers.length - 1];

    const startTime = firstTiming.getStart();
    const endTime = lastTiming.getEnd();
    const totalDuration = endTime - startTime;
    let timelineMarkInterval = null;
    if (this.props.zoomFactor <= 0.15) {
      timelineMarkInterval = 1000;
    } else if (this.props.zoomFactor <= 0.3) {
      timelineMarkInterval = 500;
    } else if (this.props.zoomFactor <= 0.6) {
      timelineMarkInterval = 250;
    } else {
      timelineMarkInterval = 100;
    }
    const timelineMarks = genArray(timelineMarkInterval, Math.ceil(totalDuration / timelineMarkInterval));

    return {firstTiming, lastTiming, startTime, endTime, totalDuration, timelineMarks};
  }

  render() {
    return (
      <div className="waterfall-container">
        {this.renderTimeMarkers()}
        {this.renderTimeline()}
        {this.props.markers.map(this.renderMarker)}
      </div>
    );
  }

  renderTimeline() {
    return (
      <div className="waterfall-timeline">
        &nbsp;
        {this.state.timelineMarks.map(time => {
          const leftPos = time * this.props.zoomFactor;
          const style = {
            left: leftPos,
          };
          return <span className="waterfall-timeline-label" style={style} key={time}>{time}ms</span>;
        })}
      </div>
    );
  }

  renderTimeMarkers() {
    return (
      <div className="waterfall-time-markers">
        {this.state.timelineMarks.map(time => {
          const leftPos = time * this.props.zoomFactor;
          const style = {
            left: leftPos,
          };
          return <span className="waterfall-time-marker" style={style} key={time} />;
        })}
      </div>
    );
  }

  @autobind
  renderMarker(marker, i) {
    if (marker.getStart() === null || marker.getEnd() === null) { return <div key={i} />; }

    const startOffset = marker.getStart() - this.state.startTime;
    const duration = marker.getEnd() - marker.getStart();
    const markerStyle = {
      left: startOffset * this.props.zoomFactor,
      width: duration * this.props.zoomFactor,
    };

    return (
      <div className="waterfall-row" key={i}>
        <MarkerSpan className="waterfall-marker" style={markerStyle} marker={marker} />
        <span className="waterfall-row-label" style={{left: markerStyle.left + markerStyle.width}}>{marker.label}</span>
      </div>
    );
  }
}


class WaterfallWidget extends React.Component {
  static propTypes = {
    markers: React.PropTypes.arrayOf(React.PropTypes.instanceOf(Marker)).isRequired,
  }

  constructor(props, context) {
    super(props, context);
    this.state = {
      zoomFactor: 0.3,
      markerCount: props.markers.length,
    };
  }

  shouldComponentUpdate(nextProps, nextState) {
    return nextProps.markers.length !== this.state.markerCount ||
      nextState.zoomFactor !== this.state.zoomFactor;
  }

  componentWillReceiveProps(nextProps) {
    this.setState({markerCount: nextProps.markers.length});
  }

  render() {
    const {markers} = this.props;
    const firstTiming = markers[0];
    const lastTiming = markers[markers.length - 1];

    const startTime = firstTiming.getStart();
    const endTime = lastTiming.getEnd();
    const duration = endTime - startTime;

    return (
      <div className="waterfall-widget inset-pannel">
        <div className="waterfall-header">
          <div className="waterfall-header-text">
            {this.props.markers.length} event(s) over {Math.floor(duration)}ms
          </div>
          <div className="waterfall-header-zoom">
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
        <Waterfall markers={this.props.markers} zoomFactor={this.state.zoomFactor} />
      </div>
    );
  }

  @autobind
  handleZoomFactorChange(e) {
    this.setState({zoomFactor: parseFloat(e.target.value)});
  }
}


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
          Hi.
        </div>
        {groups.map((group, idx) => (
          <WaterfallWidget key={group.id} markers={group.markers} />
        ))}
      </div>
    );
  }

  // render() {
  //   return (
  //     <div className="github-GitTimingsView">
  //       <div className="github-GitTimingsView-header">
  //         <button className="btn" onClick={this.handleAddSpacer}>
  //           Add Spacer
  //         </button>
  //       </div>
  //       <table>
  //         <thead>
  //           <tr>
  //             <th>Command</th>
  //             <th>Enqueued At</th>
  //             <th>Queue</th>
  //             <th>Prepare</th>
  //             <th>Execute</th>
  //           </tr>
  //         </thead>
  //         <tbody>
  //           {markers.map(this.renderMarker)}
  //         </tbody>
  //       </table>
  //     </div>
  //   );
  // }

  // @autobind
  // handleAddSpacer(e) {
  //   e.preventDefault();
  //   GitTimingsView.generateMarker('👾');
  // }

  // @autobind
  // renderMarker(marker, idx) {
  //   return (
  //     <tr key={markers.length - idx}>
  //       <td>{marker.label}</td>
  //       <td>{this.getStartTime(marker, 'queued')}</td>
  //       <td>{this.getElapsedTime(marker, 'queued')}</td>
  //       <td>{this.getElapsedTime(marker, 'prepare')}</td>
  //       <td>{this.getElapsedTime(marker, 'execute')}</td>
  //     </tr>
  //   );
  // }

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
