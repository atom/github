import React from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';
import {remote, shell} from 'electron';
const {Menu, MenuItem} = remote;
import {TextBuffer} from 'atom';


import Timeago from './timeago';
import Octicon from '../atom/octicon';
import AtomTextEditor from '../atom/atom-text-editor';
import GithubDotcomMarkdown from './github-dotcom-markdown';
import EmojiReactionsController from '../controllers/emoji-reactions-controller';
import {GHOST_USER} from '../helpers';
import {addEvent} from '../reporter-proxy';
import RefHolder from '../models/ref-holder';

export default class ReviewCommentView extends React.Component {
  static propTypes = {
    comment: PropTypes.object.isRequired,
    isPosting: PropTypes.bool.isRequired,
    confirm: PropTypes.object.isRequired,
    tooltips: PropTypes.object.isRequired,
    renderEditedLink: PropTypes.func.isRequired,
    renderAuthorAssociation: PropTypes.func.isRequired,
    reportMutationErrors: PropTypes.func.isRequired,
    openIssueish: PropTypes.func.isRequired,
    openIssueishLinkInNewTab: PropTypes.func.isRequired,
    updateComment: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props);

    this.refEditor = new RefHolder();

    this.state = {editing: false};
  }

  render() {
    return this.state.editing ? this.renderEditor() : this.renderComment();
  }

  renderEditor() {
    const buffer = new TextBuffer();
    buffer.setText(this.props.comment.body);

    return (
      <div className={cx('github-Review-editComment', {'github-Review-editComment--disabled': this.props.isPosting})}>
        <AtomTextEditor
          buffer={buffer}
          lineNumberGutterVisible={false}
          softWrapped={true}
          autoHeight={true}
          readOnly={this.props.isPosting}
          refModel={this.refEditor}
        />
        <footer className="github-Review-editComment-footer">
          <button
            className="github-Review-editCommentCancelButton btn"
            title="Cancel editing comment"
            disabled={this.props.isPosting}
            onClick={() => this.onCancel(buffer.getText() || '')}>
            Cancel
          </button>
          <button
            className="github-Review-updateCommentButton btn btn-primary"
            title="Update comment"
            disabled={this.props.isPosting}
            onClick={() => this.onSubmitUpdate(buffer.getText() || '')}>
            Update comment
          </button>
        </footer>
      </div>
    );
  }

  renderComment() {
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

  onCancel = text => {
    if (text === this.props.comment.body) {
      this.setState({editing: false});
    } else {
      const choice = this.props.confirm({
        message: 'Are you sure you want to discard your unsaved changes?',
        buttons: ['OK', 'Cancel'],
      });
      if (choice === 0) {
        this.setState({editing: false});
      }
    }
  }

  onSubmitUpdate = text => {
    if (text === this.props.comment.body || text === '') {
      this.setState({editing: false});
      return;
    }
    const didUpdateComment = () => this.setState({editing: false});
    this.props.updateComment(this.props.comment.id, text, didUpdateComment);
  }

  showActionsMenu = (event, comment, author) => {
    event.preventDefault();

    const menu = new Menu();

    menu.append(new MenuItem({
      label: 'Edit',
      click: () => this.setState({editing: true}),
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
