import React from 'react';
import PropTypes from 'prop-types';
import path from 'path';

import {AuthorPropType} from '../prop-types';
import Octicon from '../atom/octicon';

export default class GitTabHeaderView extends React.Component {
  static propTypes = {
    committer: AuthorPropType.isRequired,

    // Workspace
    workdir: PropTypes.string,
    workdirs: PropTypes.shape({[Symbol.iterator]: PropTypes.func.isRequired}).isRequired,
    contextLocked: PropTypes.bool.isRequired,
    changingWorkDir: PropTypes.bool.isRequired,
    changingLock: PropTypes.bool.isRequired,

    // Event Handlers
    handleWorkDirSelect: PropTypes.func,
    handleLockToggle: PropTypes.func,
  }

  render() {
    return (
      <header className="github-Project">
        {this.renderCommitter()}
        <select className="github-Project-path input-select"
          value={this.props.workdir ? path.normalize(this.props.workdir) : undefined}
          onChange={this.props.handleWorkDirSelect ? this.props.handleWorkDirSelect : () => {}}>
          {this.renderWorkDirs()}
        </select>
        <button className="github-Project-lock btn btn-small" onClick={this.props.handleLockToggle}>
          <Octicon icon={this.props.contextLocked ? 'globe' : 'lock'} />
        </button>
      </header>
    );
  }

  renderWorkDirs() {
    const workdirs = [];
    for (const workdir of this.props.workdirs) {
      workdirs.push(<option key={workdir} value={path.normalize(workdir)}>{path.basename(workdir)}</option>);
    }
    return workdirs;
  }

  renderCommitter() {
    const email = this.props.committer.getEmail();
    const avatarUrl = this.props.committer.getAvatarUrl();
    const name = this.props.committer.getFullName();

    return (
      <img className="github-Project-avatar"
        src={avatarUrl || 'atom://github/img/avatar.svg'}
        title={`${name} ${email}`}
        alt={`${name}'s avatar`}
      />
    );
  }
}
