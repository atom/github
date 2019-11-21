import React from 'react';
import PropTypes from 'prop-types';
import {CompositeDisposable} from 'atom';
import {AuthorPropType} from '../prop-types';
import GitTabHeaderView from '../views/git-tab-header-view';

export default class GitTabHeaderController extends React.Component {
  static propTypes = {
    committer: AuthorPropType.isRequired,

    // Workspace
    currentWorkDir: PropTypes.string,
    getCurrentWorkDirs: PropTypes.func.isRequired,

    // Event Handlers
    handleWorkDirSelect: PropTypes.func.isRequired,
    onDidChangeWorkDirs: PropTypes.func.isRequired,
    onDidClickAvatar: PropTypes.func.isRequired,
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
    this.disposable = this.props.onDidChangeWorkDirs(this.resetWorkDirs);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.onDidChangeWorkDirs !== this.props.onDidChangeWorkDirs) {
      this.disposable.dispose();
      this.disposable = this.props.onDidChangeWorkDirs(this.resetWorkDirs);
    }
  }

  render() {
    return (
      <GitTabHeaderView
        committer={this.props.committer}

        // Workspace
        workdir={this.props.currentWorkDir}
        workdirs={this.state.currentWorkDirs}

        // Event Handlers
        handleWorkDirSelect={this.props.handleWorkDirSelect}
        onDidClickAvatar={this.props.onDidClickAvatar}
      />
    );
  }

  resetWorkDirs = () => {
    this.setState((state, props) => ({
      currentWorkDirs: [],
    }));
  }

  componentWillUnmount() {
    this.disposable.dispose();
  }
}
