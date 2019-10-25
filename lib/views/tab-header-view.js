import React from 'react';
import PropTypes from 'prop-types';
import path from 'path';

export default class TabHeaderView extends React.Component {
  static propTypes = {
    currentWorkDir: PropTypes.string,

    handleWorkDirSelect: PropTypes.func,
    onDidChangeWorkDirs: PropTypes.func,
    getCurrentWorkDirs: PropTypes.func,
  }

  constructor(props) {
    super(props);
    this.state = {currentWorkDirs: props.getCurrentWorkDirs()};
    this.disposable = props.onDidChangeWorkDirs(this.updateWorkDirs);
  }

  render() {
    return (
      <header className="github-Project">
        <select className="github-Project-path input-select"
          value={this.props.currentWorkDir ? this.props.currentWorkDir : undefined}
          onChange={this.props.handleWorkDirSelect ? this.props.handleWorkDirSelect : () => {}}>
          {this.renderWorkDirs()}
        </select>
      </header>
    );
  }

  renderWorkDirs() {
    const workdirs = [];
    for (const workdir of this.state.currentWorkDirs) {
      workdirs.push(<option key={workdir} value={workdir}>{path.basename(workdir)}</option>);
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
