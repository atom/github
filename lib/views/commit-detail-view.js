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

    messageCollapsible: PropTypes.bool.isRequired,
    messageOpen: PropTypes.bool.isRequired,
    toggleMessage: PropTypes.func.isRequired,

    currentRemote: PropTypes.object.isRequired,
    currentBranch: PropTypes.object.isRequired,
    isCommitPushed: PropTypes.bool.isRequired,
  }

  render() {
    const commit = this.props.commit;

    return (
      <div className="github-CommitDetailView">
        <div className="github-CommitDetailView-header">
          <div className="github-CommitDetailView-commit">
            <h3 className="github-CommitDetailView-title">{emojify(commit.getMessageSubject())}</h3>
            {this.renderCommitMessageBody()}
            {this.renderShowMoreButton()}
            <div className="github-CommitDetailView-meta">
              {/* TODO fix image src */}
              {this.renderAuthors()}
              <span className="github-CommitDetailView-metaText">
                {commit.getAuthorEmail()} committed {this.humanizeTimeSince(commit.getAuthorDate())}
              </span>
              {this.renderDotComLink()}
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

  renderCommitMessageBody() {
    const collapsed = this.props.messageCollapsible && !this.props.messageOpen;

    return (
      <pre className="github-CommitDetailView-moreText">
        {collapsed ? this.props.commit.abbreviatedBody() : this.props.commit.getMessageBody()}
      </pre>
    );
  }

  renderShowMoreButton() {
    if (!this.props.messageCollapsible) {
      return null;
    }

    const buttonText = this.props.messageOpen ? 'Show Less' : 'Show More';
    return (
      <button className="github-CommitDetailView-moreButton" onClick={this.props.toggleMessage}>{buttonText}</button>
    );
  }

  humanizeTimeSince(date) {
    return moment(date * 1000).fromNow();
  }

  renderDotComLink() {
    const remote = this.props.currentRemote;
    const sha = this.props.commit.getSha();
    if (remote && remote.isGithubRepo() && this.props.isCommitPushed) {
      const repoUrl = `https://www.github.com/${this.props.currentRemote.getOwner()}/${this.props.currentRemote.getRepo()}`;
      return (
        <div className="github-CommitDetailView-sha">
          <a href={`${repoUrl}/commit/${sha}`}
            title={`open commit ${sha} on GitHub.com`}>
            {sha}
          </a>
        </div>
      );
    } else {
      return null;
    }
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
      <img className="github-CommitDetailView-avatar github-RecentCommit-avatar"
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
      <span className="github-CommitDetailView-authors github-RecentCommit-authors">
        {authorEmails.map(this.renderAuthor)}
      </span>
    );
  }
}
