import React from 'react';
import PropTypes from 'prop-types';
import path from 'path';
import {Disposable} from 'atom';
import {AuthorPropType} from '../prop-types';

export default class GithubTabHeaderView extends React.Component {
  static propTypes = {
    currentWorkDir: PropTypes.string,
    committer: AuthorPropType.isRequired,

    handleWorkDirSelect: PropTypes.func,
    onDidChangeWorkDirs: PropTypes.func,
    getCurrentWorkDirs: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props);
    this.state = {currentWorkDirs: []};
  }

  static getDerivedStateFromProps(props, state) {
    return {
      currentWorkDirs: props.getCurrentWorkDirs(),
    };
  }

  componentDidMount() {
    if (this.props.onDidChangeWorkDirs) {
      this.disposable = this.props.onDidChangeWorkDirs(this.updateWorkDirs);
    }
  }

  componentDidUpdate(prevProps) {
    if (
      prevProps.onDidChangeWorkDirs !== this.props.onDidChangeWorkDirs
    ) {
      if (this.disposable) {
        this.disposable.dispose();
      }
      if (this.props.onDidChangeWorkDirs) {
        this.disposable = this.props.onDidChangeWorkDirs(this.updateWorkDirs);
      }
    }
  }

  render() {
    return (
      <header className="github-Project">
        {this.renderCommitter()}
        <select className="github-Project-path input-select"
          value={this.props.currentWorkDir ? path.normalize(this.props.currentWorkDir) : undefined}
          onChange={this.props.handleWorkDirSelect ? this.props.handleWorkDirSelect : () => {}}>
          {this.renderWorkDirs()}
        </select>
      </header>
    );
  }

  renderWorkDirs() {
    const workdirs = [];
    for (const workdir of this.state.currentWorkDirs) {
      workdirs.push(<option key={workdir} value={path.normalize(workdir)}>{path.basename(workdir)}</option>);
    }
    return workdirs;
  }

  updateWorkDirs = () => {
    this.setState((state, props) => ({
      currentWorkDirs: props.getCurrentWorkDirs(),
    }));
  }

  renderCommitter() {
    const login = this.props.committer.getLogin();
    const avatarUrl = this.props.committer.getAvatarUrl();

    return (
      <img className="github-Project-avatar"
        src={avatarUrl ? avatarUrl : 'atom://github/img/avatar.svg'}
        title={`@${login}`}
        alt={`@${login}'s avatar`}
      />
    );
  }

  componentWillUnmount() {
    if (this.disposable) {
      this.disposable.dispose();
    }
  }
}
