import React from 'react';
import {autobind} from 'core-decorators';
import memoize from 'lodash.memoize';

import Marker from './marker';
import MarkerSpan from './marker-span';

const genArray = memoize(function genArray(interval, count) {
  const arr = [];
  for (let i = 1; i <= count; i++) {
    arr.push(interval * i);
  }
  return arr;
}, (interval, count) => `${interval}:${count}`);

export default class Waterfall extends React.Component {
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
    const firstMarker = markers[0];
    const lastMarker = markers[markers.length - 1];

    const startTime = firstMarker.getStart();
    const endTime = lastMarker.getEnd();
    const totalDuration = endTime - startTime;
    let timelineMarkInterval = null;
    if (props.zoomFactor <= 0.15) {
      timelineMarkInterval = 1000;
    } else if (props.zoomFactor <= 0.3) {
      timelineMarkInterval = 500;
    } else if (props.zoomFactor <= 0.6) {
      timelineMarkInterval = 250;
    } else {
      timelineMarkInterval = 100;
    }
    const timelineMarks = genArray(timelineMarkInterval, Math.ceil(totalDuration / timelineMarkInterval));

    return {firstMarker, lastMarker, startTime, endTime, totalDuration, timelineMarks};
  }

  render() {
    return (
      <div className="waterfall-scroller">
        <div className="waterfall-container">
          {this.renderTimeMarkers()}
          {this.renderTimeline()}
          {this.props.markers.map(this.renderMarker)}
        </div>
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
          return <span className="waterfall-timeline-label" style={style} key={`tl:${time}`}>{time}ms</span>;
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
          return <span className="waterfall-time-marker" style={style} key={`tm:${time}`} />;
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
        <span
          className="waterfall-row-label"
          style={{paddingLeft: markerStyle.left + markerStyle.width}}>{marker.label}</span>
        <MarkerSpan className="waterfall-marker" style={markerStyle} marker={marker} />
      </div>
    );
  }
}
