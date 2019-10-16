import React from 'react';
import PropTypes from 'prop-types';
import path from 'path';

export default class HeaderView extends React.Component {

  render() {
    return (
      <header className="github-Project">
        <select className="github-Project-path input-select"
        value={this.props.currentProject}
        onChange={this.props.handleProjectSelect}>
          {this.renderProjects()}
        </select>
      </header>
    );
  }

  renderProjects = () => {
    const projects = [];
    for (const projectPath of this.props.projectPaths) {
      projects.push(<option key={projectPath} value={projectPath}>{path.basename(projectPath)}</option>);
    }
    return projects;
  };
}
