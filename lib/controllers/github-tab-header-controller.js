import React from 'react';
import PropTypes from 'prop-types';
import path from 'path';
import {Disposable} from 'atom';
import {AuthorPropType} from '../prop-types';
import GithubTabHeaderView from '../views/github-tab-header-view';

export default class GithubTabHeaderController extends React.Component {
  static propTypes = {
    user: AuthorPropType.isRequired,

    // Workspace
    currentWorkDir: PropTypes.string,
    getCurrentWorkDirs: PropTypes.func.isRequired,

    // Event Handlers
    handleWorkDirSelect: PropTypes.func,
    onDidChangeWorkDirs: PropTypes.func,
  }

  constructor(props) {
    super(props);
    this.state = {currentWorkDirs: []};
  }

  static getDerivedStateFromProps(props, state) {
    return {
      currentWorkDirs: props.getCurrentWorkDirs() || [],
    };
  }

  componentDidMount() {
    if (this.props.onDidChangeWorkDirs) {
      this.disposable = this.props.onDidChangeWorkDirs(this.updateWorkDirs);
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.onDidChangeWorkDirs !== this.props.onDidChangeWorkDirs) {
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

  updateWorkDirs = () => {
    this.setState((state, props) => ({
      currentWorkDirs: props.getCurrentWorkDirs() || [],
    }));
  }

  componentWillUnmount() {
    if (this.disposable) {
      this.disposable.dispose();
    }
  }
}
