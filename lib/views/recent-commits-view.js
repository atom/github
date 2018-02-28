import React from 'react';
import PropTypes from 'prop-types';
import {autobind} from 'core-decorators';

class RecentCommitView extends React.Component {
  static propTypes = {
    commit: PropTypes.object.isRequired,
  };

  render() {
    return (
      <li className="github-RecentCommit">
        <img className="github-RecentCommit-avatar"
          src={'https://avatars.githubusercontent.com/u/e?email=' + encodeURIComponent(this.props.commit.getAuthorEmail())}
          title={`${this.props.commit.getAuthorEmail()}`}
        />
        <span className="github-RecentCommit-message">{this.props.commit.getMessage()}</span>
        <time className="github-RecentCommit-time"
          title={this.props.commit.getAuthorDate()}>
          1h
        </time>
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
          <div className="github-RecentCommits-message">
            Recent commits
          </div>
        );
      } else {
        return (
          <div className="github-RecentCommits-message">
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
