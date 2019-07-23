import React from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';

import AtomTextEditor from '../atom/atom-text-editor';

export default class RemoteConfigurationView extends React.Component {
  static propTypes = {
    currentProtocol: PropTypes.oneOf(['https', 'ssh']),
    sourceRemoteBuffer: PropTypes.object.isRequired,
    didChangeProtocol: PropTypes.func.isRequired,
  }

  render() {
    const httpsClassName = cx(
      'github-RemoteConfiguration-protocolOption',
      'github-RemoteConfiguration-protocolOption--https',
      'input-label',
    );

    const sshClassName = cx(
      'github-RemoteConfiguration-protocolOption',
      'github-RemoteConfiguration-protocolOption--ssh',
      'input-label',
    );

    return (
      <details className="github-RemoteConfiguration-details block">
        <summary>Advanced</summary>
        <main>
          <div className="github-RemoteConfiguration-protocol block">
            <span className="github-RemoteConfiguration-protocolHeading">Protocol:</span>
            <label className={httpsClassName}>
              <input
                className="input-radio"
                type="radio"
                name="protocol"
                value="https"
                checked={this.props.currentProtocol === 'https'}
                onChange={this.handleProtocolChange}
              />
              HTTPS
            </label>
            <label className={sshClassName}>
              <input
                className="input-radio"
                type="radio"
                name="protocol"
                value="ssh"
                checked={this.props.currentProtocol === 'ssh'}
                onChange={this.handleProtocolChange}
              />
              SSH
            </label>
          </div>
          <div className="github-RemoteConfiguration-sourceRemote block">
            <label className="input-label">Source remote name:
              <AtomTextEditor
                className="github-RemoteConfiguration-sourceRemoteName"
                mini={true}
                autoWidth={false}
                buffer={this.props.sourceRemoteBuffer}
              />
            </label>
          </div>
        </main>
      </details>
    );
  }

  handleProtocolChange = event => {
    this.props.didChangeProtocol(event.target.value);
  }
}
