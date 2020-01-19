import React from 'react';
import PropTypes from 'prop-types';
import {AuthorPropType} from '../prop-types';
import {CompositeDisposable} from 'atom';
import GithubTabHeaderView from '../views/github-tab-header-view';

export default class GithubTabHeaderController extends React.Component {
  static propTypes = {
    config: PropTypes.object.isRequired,
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
    this.state = {
      currentWorkDirs: [],
      disableProjectSelection: this.props.config.get('github.useProjectFromActivePanel'),
    };
    this.disposable = new CompositeDisposable();
  }

  static getDerivedStateFromProps(props, state) {
    return {
      currentWorkDirs: props.getCurrentWorkDirs(),
    };
  }

  componentDidMount() {
    this.disposable.add(
      this.props.onDidChangeWorkDirs(this.resetWorkDirs),
      this.props.config.onDidChange('github.useProjectFromActivePanel', this.handleUseProjectFromActivePanelChange),
    );
  }

  componentDidUpdate(prevProps) {
    if (prevProps.onDidChangeWorkDirs !== this.props.onDidChangeWorkDirs) {
      this.disposable.dispose();
      this.disposeable = new CompositeDisposable();
      this.disposable.add(
        this.props.onDidChangeWorkDirs(this.resetWorkDirs),
        this.props.config.onDidChange('github.useProjectFromActivePanel', this.handleUseProjectFromActivePanelChange),
      );
    }
  }

  render() {
    return (
      <GithubTabHeaderView
        disableProjectSelection={this.state.disableProjectSelection}
        user={this.props.user}

        // Workspace
        workdir={this.props.currentWorkDir}
        workdirs={this.state.currentWorkDirs}

        // Event Handlers
        handleWorkDirSelect={this.props.handleWorkDirSelect}
      />
    );
  }

  handleUseProjectFromActivePanelChange = ({newValue}) => {
    this.setState({disableProjectSelection: newValue});
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
