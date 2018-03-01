import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';

import Timeago from './timeago';

moment.updateLocale('en', {
  relativeTime : {
    future: "%s",
    past:   "%s",
    s  : 'Now',
    ss : '<1m',
    m:  "1m",
    mm: "%dm",
    h:  "1h",
    hh: "%dh",
    d:  "1d",
    dd: "%dd",
    M:  "1M",
    MM: "%dM",
    y:  "1y",
    yy: "%d y"
  }
});

class RecentCommitView extends React.Component {
  static propTypes = {
    commit: PropTypes.object.isRequired,
  };

  render() {
    const authorMoment = moment(this.props.commit.getAuthorDate() * 1000);

    return (
      <li className="github-RecentCommit">
        <img className="github-RecentCommit-avatar"
          src={'https://avatars.githubusercontent.com/u/e?email=' + encodeURIComponent(this.props.commit.getAuthorEmail()) + '&s=32'}
          title={`${this.props.commit.getAuthorEmail()}`}
        />
        <span
          className="github-RecentCommit-message"
          title={this.props.commit.getMessage() + '\n\n' + this.props.commit.getBody()}>
          {this.props.commit.getMessage()}
        </span>
        <Timeago
          className="github-RecentCommit-time"
          type="time"
          time={authorMoment}
          title={authorMoment.format('MMM Do, YYYY')}
        />
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
