import React from 'react';
import PropTypes from 'prop-types';
import {AuthorPropType} from '../prop-types';
import GithubTabHeaderView from '../views/github-tab-header-view';

export default class GithubTabHeaderController extends React.Component {
  static propTypes = {
    user: AuthorPropType.isRequired,

    // Workspace
    currentWorkDir: PropTypes.string,
    getCurrentWorkDirs: PropTypes.func.isRequired,

    // Event Handlers
    handleWorkDirSelect: PropTypes.func.isRequired,
    onDidChangeWorkDirs: PropTypes.func.isRequired,
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
      if (this.disposable) {
        this.disposable.dispose();
      }
      this.disposable = this.props.onDidChangeWorkDirs(this.resetWorkDirs);
    }
  }

  render() {
    return (
      <GithubTabHeaderView
        user={this.props.user}

        // Workspace
        workdir={this.props.currentWorkDir}
        workdirs={this.state.currentWorkDirs}

        // Event Handlers
        handleWorkDirSelect={this.props.handleWorkDirSelect}
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
