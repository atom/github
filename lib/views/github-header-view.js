import React from 'react';
import PropTypes from 'prop-types';
import path from 'path';

export default class GitHubHeaderView extends React.Component {
  render() {
    return (
      <header className="github-Project">
        <img className="github-Project-avatar" src="https://avatars.githubusercontent.com/u/e?email=smashwilson%40github.com&amp;s=32" />
        <select className="github-Project-path input-select"
        value={this.props.currentProject}
        onChange={this.props.handleProjectSelect}>
          {this.renderProjects()}
        </select>
        <span className="github-Project-refreshButton icon icon-sync" />
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
