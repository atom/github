import React from 'react';
import PropTypes from 'prop-types';
import path from 'path';

import {AuthorPropType} from '../prop-types';
import Octicon from '../atom/octicon';

export default class GithubTabHeaderView extends React.Component {
  static propTypes = {
    user: AuthorPropType.isRequired,

    // Workspace
    workdir: PropTypes.string,
    workdirs: PropTypes.shape({[Symbol.iterator]: PropTypes.func.isRequired}).isRequired,
    contextLocked: PropTypes.bool.isRequired,
    handleWorkDirChange: PropTypes.func.isRequired,
    handleLockToggle: PropTypes.func.isRequired,
  }

  render() {
    return (
      <header className="github-Project">
        {this.renderUser()}
        <select className="github-Project-path input-select"
          value={this.props.workdir ? path.normalize(this.props.workdir) : undefined}
          onChange={this.props.handleWorkDirChange}>
          {this.renderWorkDirs()}
        </select>
        <button className="github-Project-lock btn btn-small" onClick={this.props.handleLockToggle}>
          <Octicon icon={this.props.contextLocked ? 'lock' : 'globe'} />
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

  renderUser() {
    const login = this.props.user.getLogin();
    const avatarUrl = this.props.user.getAvatarUrl();

    return (
      <img className="github-Project-avatar"
        src={avatarUrl || 'atom://github/img/avatar.svg'}
        title={`@${login}`}
        alt={`@${login}'s avatar`}
      />
    );
  }
}
