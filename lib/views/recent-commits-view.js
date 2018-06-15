import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import cx from 'classnames';
import { emojify } from 'node-emoji';

import Timeago from './timeago';

class RecentCommitView extends React.Component {
  static propTypes = {
    commit: PropTypes.object.isRequired,
    undoLastCommit: PropTypes.func.isRequired,
    isMostRecent: PropTypes.bool.isRequired,
  };

  render() {
    const authorMoment = moment(this.props.commit.getAuthorDate() * 1000);
    const fullMessage = this.props.commit.getFullMessage();

    return (
      <li className={cx('github-RecentCommit', {'most-recent': this.props.isMostRecent})}>
        {this.renderAuthors()}
        <span
          className="github-RecentCommit-message"
          title={emojify(fullMessage)}>
          {emojify(this.props.commit.getMessageSubject())}
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

  renderAuthor(email) {
    const match = email.match(/^(\d+)\+[^@]+@users.noreply.github.com$/);

    let avatarUrl;
    if (match) {
      avatarUrl = 'https://avatars.githubusercontent.com/u/' + match[1] + '?s=32';
    } else {
      avatarUrl = 'https://avatars.githubusercontent.com/u/e?email=' + encodeURIComponent(email) + '&s=32';
    }

    return (
      <img className="github-RecentCommit-avatar"
        key={email}
        src={avatarUrl}
        title={email}
      />
    );
  }

  renderAuthors() {
    const coAuthorEmails = this.props.commit.getCoAuthors().map(author => author.email);
    const authorEmails = [this.props.commit.getAuthorEmail(), ...coAuthorEmails];

    return (
      <span className="github-RecentCommit-authors">
        {authorEmails.map(this.renderAuthor)}
      </span>
    );
  }
}

export default class RecentCommitsView extends React.Component {
  static propTypes = {
    commits: PropTypes.arrayOf(PropTypes.object).isRequired,
    isLoading: PropTypes.bool.isRequired,
    undoLastCommit: PropTypes.func.isRequired,
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
                undoLastCommit={this.props.undoLastCommit}
              />
            );
          })}
        </ul>
      );
    }

  }
}
