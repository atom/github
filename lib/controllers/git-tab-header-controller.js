import React from 'react';
import PropTypes from 'prop-types';
import {CompositeDisposable} from 'atom';
import {nullAuthor} from '../models/author';
import GitTabHeaderView from '../views/git-tab-header-view';

export default class GitTabHeaderController extends React.Component {
  static propTypes = {
    getCommitter: PropTypes.func.isRequired,

    // Workspace
    currentWorkDir: PropTypes.string,
    getCurrentWorkDirs: PropTypes.func.isRequired,

    // Event Handlers
    handleWorkDirSelect: PropTypes.func.isRequired,
    onDidChangeWorkDirs: PropTypes.func.isRequired,
    onDidUpdateRepo: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props);
    this._isMounted = false;
    this.state = {currentWorkDirs: [], committer: nullAuthor};
    this.disposable = new CompositeDisposable();
  }

  static getDerivedStateFromProps(props, state) {
    return {
      currentWorkDirs: props.getCurrentWorkDirs(),
    };
  }

  componentDidMount() {
    this._isMounted = true;
    this.disposable.add(this.props.onDidChangeWorkDirs(this.updateWorkDirs));
    this.disposable.add(this.props.onDidUpdateRepo(this.updateCommitter));
    this.updateCommitter();
  }

  componentDidUpdate(prevProps) {
    if (
      prevProps.onDidChangeWorkDirs !== this.props.onDidChangeWorkDirs
      || prevProps.onDidUpdateRepo !== this.props.onDidUpdateRepo
    ) {
      this.disposable.dispose();
      this.disposable = new CompositeDisposable();
      this.disposable.add(this.props.onDidChangeWorkDirs(this.updateWorkDirs));
      this.disposable.add(this.props.onDidUpdateRepo(this.updateCommitter));
    }
    if (prevProps.getCommitter !== this.props.getCommitter) {
      this.updateCommitter();
    }
  }

  render() {
    return (
      <GitTabHeaderView
        committer={this.state.committer}

        // Workspace
        workdir={this.props.currentWorkDir}
        workdirs={this.state.currentWorkDirs}

        // Event Handlers
        handleWorkDirSelect={this.props.handleWorkDirSelect}
      />
    );
  }

  updateWorkDirs = () => {
    this.setState((state, props) => ({
      currentWorkDirs: props.getCurrentWorkDirs() || [],
    }));
  }

  updateCommitter = async () => {
    const committer = await this.props.getCommitter() || nullAuthor;
    if (this._isMounted) {
      this.setState({committer});
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
    this.disposable.dispose();
  }
}
