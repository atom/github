import React from 'react';
import PropTypes from 'prop-types';
import path from 'path';

export default class TabHeaderView extends React.Component {
  static propTypes = {
    currentWorkDir: PropTypes.string,

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

  render() {
    return (
      <header className="github-Project">
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

  componentWillUnmount() {
    if (this.disposable && this.disposable.dispose) {
      this.disposable.dispose();
    }
  }
}
