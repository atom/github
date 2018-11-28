import React from 'react';
import PropTypes from 'prop-types';
import {emojify} from 'node-emoji';
import moment from 'moment';

import MultiFilePatchController from '../controllers/multi-file-patch-controller';
import CommitDetailItem from '../items/commit-detail-item';

export default class CommitDetailView extends React.Component {
  static propTypes = {
    repository: PropTypes.object.isRequired,
    commit: PropTypes.object.isRequired,
    itemType: PropTypes.oneOf([CommitDetailItem]).isRequired,

    workspace: PropTypes.object.isRequired,
    commands: PropTypes.object.isRequired,
    keymaps: PropTypes.object.isRequired,
    tooltips: PropTypes.object.isRequired,
    config: PropTypes.object.isRequired,

    destroy: PropTypes.func.isRequired,
  }

  render() {
    const commit = this.props.commit;
    // const {messageHeadline, messageBody, abbreviatedOid, url} = this.props.item;
    // const {avatarUrl, name, date} = this.props.item.committer;

    return (
      <div className="github-CommitDetailView">
        <div className="github-CommitDetailView-header">
          <div className="github-CommitDetailView-commitContainer">
            <div className="github-CommitDetailView-commit">
              <h3 className="github-CommitDetailView-title">
                {emojify(commit.getMessageSubject())}
              </h3>
              <pre className="github-CommitDetailView-moreText">
                {emojify(commit.getMessageBody())}</pre>
              <div className="github-CommitDetailView-meta">
                {/* TODO fix image src */}
                {this.renderAuthors()}
                <span className="github-CommitDetailView-metaText">
                  {commit.getAuthorEmail()} committed {this.humanizeTimeSince(commit.getAuthorDate())}
                </span>
              </div>
            </div>
            <div className="github-CommitDetailView-sha">
              {/* TODO fix href */}
              <a href="https://github.com/atom/github/commit/6e0781600cccc3de2cc981f0d43209bf31cf86c8"
                title={`open commit ${commit.getSha()} on GitHub.com`}>
                {commit.getSha()}
              </a>
            </div>
          </div>
        </div>
        <MultiFilePatchController
          multiFilePatch={commit.getMultiFileDiff()}
          autoHeight={false}
          {...this.props}
        />
      </div>
    );
  }

  humanizeTimeSince(date) {
    return moment(date * 1000).fromNow();
  }

  getAuthorInfo() {
    const coAuthorCount = this.props.commit.getCoAuthors().length;
    return coAuthorCount ? this.props.commit.getAuthorEmail() : `${coAuthorCount + 1} people`;
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
}
