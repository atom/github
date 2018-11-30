import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import cx from 'classnames';
import {emojify} from 'node-emoji';

import Commands, {Command} from '../atom/commands';
import RefHolder from '../models/ref-holder';

import Timeago from './timeago';

class RecentCommitView extends React.Component {
  static propTypes = {
    commit: PropTypes.object.isRequired,
    undoLastCommit: PropTypes.func.isRequired,
    isMostRecent: PropTypes.bool.isRequired,
    openCommit: PropTypes.func.isRequired,
    isSelected: PropTypes.bool.isRequired,
  };

  render() {
    const authorMoment = moment(this.props.commit.getAuthorDate() * 1000);
    const fullMessage = this.props.commit.getFullMessage();

    return (
      <li
        className={cx('github-RecentCommit', {
          'most-recent': this.props.isMostRecent,
          'is-selected': this.props.isSelected,
        })}
        onClick={this.props.openCommit}>
        {this.renderAuthors()}
        <span
          className="github-RecentCommit-message"
          title={emojify(fullMessage)}>
          {emojify(this.props.commit.getMessageSubject())}
        </span>
        {this.props.isMostRecent && (
          <button
            className="btn github-RecentCommit-undoButton"
            onClick={this.undoLastCommit}>
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
        alt={`${email}'s avatar'`}
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

  undoLastCommit = event => {
    event.stopPropagation();
    this.props.undoLastCommit();
  }
}

export default class RecentCommitsView extends React.Component {
  static propTypes = {
    commits: PropTypes.arrayOf(PropTypes.object).isRequired,
    isLoading: PropTypes.bool.isRequired,
    undoLastCommit: PropTypes.func.isRequired,
    openCommit: PropTypes.func.isRequired,
    selectedCommitSha: PropTypes.string.isRequired,
    commandRegistry: PropTypes.object.isRequired,
  };

  static focus = {
    RECENT_COMMIT: Symbol('recent_commit'),
  };

  constructor(props) {
    super(props);
    this.refRecentCommits = new RefHolder();
  }

  setFocus(focus) {
    return this.refRecentCommits.map(view => view.setFocus(focus)).getOr(false);
  }

  rememberFocus(event) {
    return this.refRecentCommits.map(view => view.rememberFocus(event)).getOr(null);
  }

  selectNextCommit() {
    // okay, we should probably move the state of the selected commit into this component
    // instead of using the sha, so we can more easily move to next / previous.
  }

  render() {
    return (
      <div className="github-RecentCommits">
        <Commands registry={this.props.commandRegistry} target="github-RecentCommits">
          <Command command="github:recent-commit-down" callback={this.selectNextCommit} />
        </Commands>
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
                openCommit={() => this.props.openCommit({sha: commit.getSha()})}
                isSelected={this.props.selectedCommitSha === commit.getSha()}
              />
            );
          })}
        </ul>
      );
    }

  }
}
