import React from 'react';
import PropTypes from 'prop-types';

import {RemoteSetPropType} from '../prop-types';
import RemoteSelector from './remote-selector';

export default class GithubHeaderView extends React.Component {
  static propTypes = {
    avatarUrl: PropTypes.string,
    remotes: RemoteSetPropType.isRequired,
    currentRemoteName: PropTypes.string.isRequired,

    handleRemoteSelect: PropTypes.func.isRequired,
  }

  render() {
    const {avatarUrl} = this.props;
    return (
      <header className="github-Project">
        <img alt="Avatar" className="github-Project-avatar" src={avatarUrl ? avatarUrl : 'atom://github/img/avatar.svg'} />
        <RemoteSelector
          currentRemoteName={this.props.currentRemoteName}
          remotes={this.props.remotes}

          handleRemoteSelect={this.props.handleRemoteSelect}
        />
        <span className="github-Project-refreshButton icon icon-sync" onClick={() => null} />
      </header>
    );
  }
}
