import React from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';
import {remote, shell} from 'electron';
const {Menu, MenuItem} = remote;

import Timeago from './timeago';
import Octicon from '../atom/octicon';
import GithubDotcomMarkdown from './github-dotcom-markdown';
import EmojiReactionsController from '../controllers/emoji-reactions-controller';
import {GHOST_USER} from '../helpers';
import {addEvent} from '../reporter-proxy';

export default class ReviewCommentView extends React.Component {
  static propTypes = {

  }

  render() {
    const comment = this.props.comment;

    if (comment.isMinimized) {
      return (
        <div className="github-Review-comment github-Review-comment--hidden" key={comment.id}>
          <Octicon icon={'fold'} className="github-Review-icon" />
          <em>This comment was hidden</em>
        </div>
      );
    }

    const commentClass = cx('github-Review-comment', {'github-Review-comment--pending': comment.state === 'PENDING'});
    const author = comment.author || GHOST_USER;

    return (
      <div className={commentClass} key={comment.id}>
        <header className="github-Review-header">
          <div className="github-Review-header-authorData">
            <img className="github-Review-avatar"
              src={author.avatarUrl} alt={author.login}
            />
            <a className="github-Review-username" href={author.url}>
              {author.login}
            </a>
            <a className="github-Review-timeAgo" href={comment.url}>
              <Timeago displayStyle="long" time={comment.createdAt} />
            </a>
            {this.props.renderEditedLink(comment)}
            {this.props.renderAuthorAssociation(comment)}
            {comment.state === 'PENDING' && (
              <span className="github-Review-pendingBadge badge badge-warning">pending</span>
            )}
          </div>
          <Octicon
            icon="ellipses"
            className="github-Review-actionsMenu"
            onClick={event => this.showActionsMenu(event, comment, author)}
          />
        </header>
        <div className="github-Review-text">
          <GithubDotcomMarkdown
            html={comment.bodyHTML}
            switchToIssueish={this.props.openIssueish}
            openIssueishLinkInNewTab={this.props.openIssueishLinkInNewTab}
          />
          <EmojiReactionsController
            reactable={comment}
            tooltips={this.props.tooltips}
            reportMutationErrors={this.props.reportMutationErrors}
          />
        </div>
      </div>
    );
  }

  showActionsMenu = (event, comment, author) => {
    event.preventDefault();

    const menu = new Menu();

    menu.append(new MenuItem({
      label: 'Edit',
      click: () => {},
    }));

    menu.append(new MenuItem({
      label: 'Open on GitHub',
      click: () => this.openOnGitHub(comment.url),
    }));

    menu.append(new MenuItem({
      label: 'Report abuse',
      click: () => this.reportAbuse(comment.url, author.login),
    }));

    menu.popup(remote.getCurrentWindow());
  }


    reportAbuse = (commentUrl, author) => {
      return new Promise((resolve, reject) => {
        const url = 'https://github.com/contact/report-content?report=' +
          `${encodeURIComponent(author)}&content_url=${encodeURIComponent(commentUrl)}`;
        shell.openExternal(url, {}, err => {
          if (err) { reject(err); } else {
            resolve();
            addEvent('report-abuse', {package: 'github', component: this.constructor.name});
          }
        });
      });
    }

    openOnGitHub = url => {
      return new Promise((resolve, reject) => {
        shell.openExternal(url, {}, err => {
          if (err) { reject(err); } else {
            resolve();
            addEvent('open-comment-in-browser', {package: 'github', component: this.constructor.name});
          }
        });
      });
    }
}
