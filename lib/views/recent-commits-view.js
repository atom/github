import React from 'react';
import PropTypes from 'prop-types';
import {autobind} from 'core-decorators';

class RecentCommitView extends React.Component {
  static propTypes = {
    commit: PropTypes.object.isRequired,
  };

  render() {
    return (
      <li className='github-RecentCommit'>
        <p>{this.props.commit.getMessage()}</p>
        <p>{this.props.commit.getAuthorEmail()}</p>
        <p>{this.props.commit.getAuthorDate()}</p>
      </li>
    );
  }
}

export default class RecentCommitsView extends React.Component {
  static propTypes = {
    commits: PropTypes.arrayOf(PropTypes.object).isRequired,
    isLoading: PropTypes.bool.isRequired,
  };

  render() {
    return (
      <div className="github-RecentCommits">
        {this.renderCommits()}
      </div>
    );
  }

  renderCommits() {
    if (this.props.commits.length === 0) {
      if (this.props.isLoading) {
        return (
          <div className="github-RecentCommit-message">
            Recent commits
          </div>
        );
      } else {
        return (
          <div className="github-RecentCommit-message">
            Make your first commit
          </div>
        );
      }
    } else {
      return (
        <ul className="github-RecentCommits-list">
          {this.props.commits.map(commit => {
            return (
              <RecentCommitView key={commit.getSha()} commit={commit} />
            );
          })}
        </ul>
      );
    }

  }
}
