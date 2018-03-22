import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import cx from 'classnames';

import Timeago from './timeago';

class RecentCommitView extends React.Component {
  static propTypes = {
    commit: PropTypes.object.isRequired,
  };

  render() {
    const authorMoment = moment(this.props.commit.getAuthorDate() * 1000);

    return (
      <li className={cx('github-RecentCommit', {'most-recent': this.props.isMostRecent})}>
        {this.renderAuthors()}
        <span
          className="github-RecentCommit-message"
          title={this.props.commit.getMessage() + '\n\n' + this.props.commit.getBody()}>
          {this.props.commit.getMessage()}
        </span>
        {this.props.isMostRecent && (
          <button
            className="btn github-RecentCommit-undoButton"
            onClick={this.props.undoLastCommit}>
            Undo
          </button>
        )}
        <Timeago
          className="github-RecentCommit-time"
          type="time"
          displayStyle="short"
          time={authorMoment}
          title={authorMoment.format('MMM Do, YYYY')}
        />
      </li>
    );
  }

  renderAuthors() {
    const authorEmails = [this.props.commit.getAuthorEmail(), ...this.props.commit.getCoAuthorEmails()];

    return (
      <span className="github-RecentCommit-authors">
        {authorEmails.map(authorEmail => {
          return (
            <img className="github-RecentCommit-avatar"
              key={authorEmail}
              src={'https://avatars.githubusercontent.com/u/e?email=' + encodeURIComponent(authorEmail) + '&s=32'}
              title={authorEmail}
            />
          );
        })}
      </span>
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
          {this.props.commits.map((commit, i) => {
            return (
              <RecentCommitView
                key={commit.getSha()}
                isMostRecent={i === 0}
                commit={commit}
              />
            );
          })}
        </ul>
      );
    }

  }
}
