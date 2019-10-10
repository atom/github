import React from 'react';
import PropTypes from 'prop-types';

import {RemoteSetPropType} from '../prop-types';

export default class RemoteSelector extends React.Component {
  static propTypes = {
    remotes: RemoteSetPropType.isRequired,
    currentRemoteName: PropTypes.string.isRequired,

    handleRemoteSelect: PropTypes.func.isRequired,
  }

  render() {
    return (
      <select
        className="github-Project-path input-select"
        value={this.props.currentRemoteName}
        onChange={this.props.handleRemoteSelect}>
        {this.renderRemotes()}
      </select>
    );
  }

  renderRemotes = () => {
    const remoteOptions = [];
    for (const remote of this.props.remotes) {
      remoteOptions.push(<option>{remote.name}</option>);
    }
    return remoteOptions;
  };
}
