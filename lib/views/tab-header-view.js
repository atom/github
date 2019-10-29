import React from 'react';
import PropTypes from 'prop-types';
import path from 'path';
import {CompositeDisposable} from 'atom';
import {nullAuthor} from '../models/author';

export default class TabHeaderView extends React.Component {
  static propTypes = {
    currentWorkDir: PropTypes.string,

    handleWorkDirSelect: PropTypes.func,
    onDidChangeWorkDirs: PropTypes.func,
    onDidUpdateRepo: PropTypes.func,
    getCurrentWorkDirs: PropTypes.func.isRequired,
    getCommitter: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props);
    this.state = {currentWorkDirs: [], committer: nullAuthor};
    this.disposable = new CompositeDisposable();
  }

  static getDerivedStateFromProps(props, state) {
    return {
      ...state,
      currentWorkDirs: props.getCurrentWorkDirs(),
    };
  }

  componentDidMount() {
    if (this.props.onDidChangeWorkDirs) {
      this.disposable.add(this.props.onDidChangeWorkDirs(this.updateWorkDirs));
    }
    if (this.props.onDidUpdateRepo) {
      this.disposable.add(this.props.onDidUpdateRepo(this.updateCommitter));
    }
    this.updateCommitter();
  }

  componentDidUpdate(prevProps) {
    if (
      prevProps.onDidChangeWorkDirs !== this.props.onDidChangeWorkDirs
      || prevProps.onDidUpdateRepo !== this.props.onDidUpdateRepo
    ) {
      this.disposable.dispose();
      this.disposable = new CompositeDisposable();
      if (this.props.onDidChangeWorkDirs) {
        this.disposable.add(this.props.onDidChangeWorkDirs(this.updateWorkDirs));
      }
      if (this.props.onDidUpdateRepo) {
        this.disposable.add(this.props.onDidUpdateRepo(this.updateCommitter));
      }
    }
    if (prevProps.getCommitter !== this.props.getCommitter) {
      this.updateCommitter();
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
    const email = this.state.committer.getEmail();
    const avatarUrl = this.state.committer.getAvatarUrl();
    const name = this.state.committer.getFullName();

    return (
      <img className="github-Project-avatar"
        src={avatarUrl ? avatarUrl : 'atom://github/img/avatar.svg'}
        title={`${name} ${email}`}
        alt={`${name}'s avatar`}
      />
    );
  }

  updateCommitter = async () => {
    const committer = this.props.getCommitter ? await this.props.getCommitter() : nullAuthor;
    this.setState({committer});
  }

  componentWillUnmount() {
    if (this.disposable && this.disposable.dispose) {
      this.disposable.dispose();
    }
  }
}
