/** @jsx etch.dom */
/* eslint react/no-unknown-property: "off" */

import etch from 'etch';
import {autobind} from 'core-decorators';

import {GitError} from '../git-shell-out-strategy';

export default class PushPullMenuView {
  constructor(props) {
    this.props = props;
    this.checkRemote();
    etch.initialize(this);
  }

  update(props) {
    this.props = {...this.props, ...props};
    this.checkRemote();
    return etch.update(this);
  }

  checkRemote() {
    if (!this.props.remoteName) {
      this.errorMessage = `Note: No remote detected for branch ${this.props.branchName}. ` +
        'Pushing will set up a remote tracking branch on remote repo "origin"';
    } else {
      this.errorMessage = '';
    }
  }

  render() {
    return (
      <div className={'github-PushPullMenuView' + (this.props.inProgress ? ' in-progress' : '')}>
        <div className="github-PushPullMenuView-selector">
          <span className="github-PushPullMenuView-item icon icon-mark-github" />
          <button
            className="github-PushPullMenuView-item btn"
            ref="fetchButton"
            onclick={this.fetch}
            disabled={!this.props.remoteName || this.props.inProgress}>
            Fetch
          </button>

          <div className="github-PushPullMenuView-item is-flexible btn-group">
            <button
              ref="pullButton"
              className="btn"
              onclick={this.pull}
              disabled={!this.props.remoteName || this.props.inProgress}>
              <span className="icon icon-arrow-down" />
              <span ref="behindCount">Pull {this.props.behindCount ? `(${this.props.behindCount})` : ''}</span>
            </button>
            <button ref="pushButton" className="btn" onclick={this.push} disabled={this.props.inProgress}>
              <span className="icon icon-arrow-up" />
              <span ref="aheadCount">Push {this.props.aheadCount ? `(${this.props.aheadCount})` : ''}</span>
            </button>
          </div>
        </div>
        <div className="github-PushPullMenuView-message" ref="message" innerHTML={this.errorMessage} />
      </div>
    );
  }

  async attemptGitOperation(operation, errorTransform = message => message) {
    const operationPromise = operation();
    try {
      etch.update(this);
      await operationPromise;
    } catch (error) {
      if (!(error instanceof GitError)) { throw error; }
      const {message, description} = errorTransform(error.stdErr);
      this.props.notificationManager.addError(message || 'Cannote complete remote interaction', {description, dismissable: true});
    }
    return etch.update(this);
  }

  @autobind
  async fetch() {
    await this.attemptGitOperation(() => this.props.fetch());
  }

  @autobind
  async pull() {
    await this.attemptGitOperation(
      () => this.props.pull(),
      description => {
        if (/error: Your local changes to the following files would be overwritten by merge/.test(description)) {
          const lines = description.split('\n');
          const files = lines.slice(3, lines.length - 3).map(l => `\`${l.trim()}\``).join('<br>');
          return {
            message: 'Pull aborted',
            description: 'Local changes to the following would be overwritten by merge:<br>' + files +
              '<br>Please commit your changes or stash them before you merge.',
          };
        }

        return {description};
      },
    );
  }

  @autobind
  async push(event) {
    await this.attemptGitOperation(
      () => this.props.push({force: event.metaKey, setUpstream: !this.props.remoteName}),
      description => {
        if (/rejected[\s\S]*failed to push/.test(description)) {
          return {
            message: 'Push rejected',
            description: 'The tip of your current branch is behind its remote counterpart.' +
              ' Try pulling before pushing again. Or, to force push, hold `cmd` while clicking.',
          };
        }

        return {description};
      },
    );
  }
}
