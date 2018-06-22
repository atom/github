import React from 'react';
import PropTypes from 'prop-types';

import {RemotePropType, BranchPropType} from '../prop-types';

export default class RemoteSelector extends React.Component {
  static propTypes = {
    remotes: PropTypes.arrayOf(RemotePropType).isRequired,
    currentBranch: BranchPropType.isRequired,
    selectRemote: PropTypes.func.isRequired,
  }

  render() {
    const {remotes, currentBranch, selectRemote} = this.props;
    return (
      <div className="github-RemoteSelector">
        <p>
          This repository has multiple remotes hosted at GitHub.com.
          Select a remote to see pull requests associated
          with the <strong>{currentBranch.getName()}</strong> branch.
        </p>
        <ul>
          {remotes.map(remote => (
            <li key={remote.getName()}>
              <a href="#" onClick={e => selectRemote(e, remote)}>
                {remote.getName()} ({remote.getOwner()}/{remote.getRepo()})
              </a>
            </li>
          ))}
        </ul>
      </div>
    );
  }
}
