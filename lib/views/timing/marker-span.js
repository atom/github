import React from 'react';
import ReactDom from 'react-dom';
import {autobind} from 'core-decorators';

import Marker from './marker';
import MarkerTooltip from './marker-tooltip';

const COLORS = {
  queued: 'red',
  prepare: 'cyan',
  nexttick: 'yellow',
  execute: 'green',
};

export default class MarkerSpan extends React.Component {
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
        ref={c => { this.element = c; }}
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
    const elem = document.createElement('div');
    ReactDom.render(<MarkerTooltip marker={this.props.marker} />, elem);
    this.tooltipDisposable = atom.tooltips.add(this.element, {
      item: elem,
      placement: 'auto bottom',
      trigger: 'manual',
    });
  }

  closeTooltip() {
    this.tooltipDisposable && this.tooltipDisposable.dispose();
    this.tooltipDisposable = null;
  }

  @autobind
  handleMouseOut(e) {
    this.closeTooltip();
  }

  componentWillUnmount() {
    this.closeTooltip();
  }
}
