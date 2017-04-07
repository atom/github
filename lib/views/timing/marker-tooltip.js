import React from 'react';

import Marker from './marker';

export default class MarkerTooltip extends React.Component {
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
