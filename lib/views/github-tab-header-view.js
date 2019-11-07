import React from 'react';
import PropTypes from 'prop-types';
import path from 'path';
import {Disposable} from 'atom';
import {AuthorPropType} from '../prop-types';

export default class GithubTabHeaderView extends React.Component {
  static propTypes = {
    user: AuthorPropType.isRequired,

    // Workspace
    workdir: PropTypes.string,
    workdirs: PropTypes.arrayOf(PropTypes.string).isRequired,

    // Event Handlers
    handleWorkDirSelect: PropTypes.func,
  }

  render() {
    return (
      <header className="github-Project">
        {this.renderUser()}
        <select className="github-Project-path input-select"
          value={this.props.workdir ? path.normalize(this.props.workdir) : undefined}
          onChange={this.props.handleWorkDirSelect ? this.props.handleWorkDirSelect : () => {}}>
          {this.renderWorkDirs()}
        </select>
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
        src={avatarUrl ? avatarUrl : 'atom://github/img/avatar.svg'}
        title={`@${login}`}
        alt={`@${login}'s avatar`}
      />
    );
  }
}
