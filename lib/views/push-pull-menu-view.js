import React from 'react';
import {autobind} from 'core-decorators';

import {GitError} from '../git-shell-out-strategy';

export default class PushPullMenuView extends React.Component {
  static propTypes = {
    inProgress: React.PropTypes.bool,
    pullDisabled: React.PropTypes.bool,
    branchName: React.PropTypes.string,
    remoteName: React.PropTypes.string,
    aheadCount: React.PropTypes.number,
    behindCount: React.PropTypes.number,
  };

  static defaultProps = {
    inProgress: false,
    pullDisabled: false,
  };

  constructor(props, context) {
    super(props, context);

    this.state = {
      errorMessage: '',
    };
  }

  render() {
    const errorMessage = this.getErrorMessage();

    return (
      <div className={'github-PushPullMenuView' + (this.props.inProgress ? ' in-progress' : '')}>
        <div className="github-PushPullMenuView-selector">
          <span className="github-PushPullMenuView-item icon icon-mark-github" />
          <button
            className="github-PushPullMenuView-item btn"
            onClick={this.fetch}
            disabled={!this.props.remoteName || this.props.inProgress}>
            Fetch
          </button>

          <div className="github-PushPullMenuView-item is-flexible btn-group">
            <button
              className="btn"
              onClick={this.pull}
              disabled={!this.props.remoteName || this.props.pullDisabled || this.props.inProgress}>
              <span className="icon icon-arrow-down" />
              <span className="github-PushPullMenuView-pull">
                Pull {this.props.behindCount ? `(${this.props.behindCount})` : ''}
              </span>
            </button>
            <button ref="pushButton" className="btn" onClick={this.push} disabled={this.props.inProgress}>
              <span className="icon icon-arrow-up" />
              <span className="github-PushPullMenuView-push">
                Push {this.props.aheadCount ? `(${this.props.aheadCount})` : ''}
              </span>
            </button>
          </div>
        </div>
        <div className="github-PushPullMenuView-message">
          {errorMessage}
        </div>
      </div>
    );
  }

  getErrorMessage() {
    if (this.state.errorMessage !== '') {
      return this.state.errorMessage;
    }

    if (!this.props.remoteName) {
      return `Note: No remote detected for branch ${this.props.branchName}. ` +
        'Pushing will set up a remote tracking branch on remote repo "origin"';
    }

    return '';
  }

  async attemptGitOperation(operation, errorTransform = message => message) {
    const operationPromise = operation();
    try {
      return await operationPromise;
    } catch (error) {
      if (!(error instanceof GitError)) { throw error; }
      const {message, description} = errorTransform(error.stdErr);
      this.props.notificationManager.addError(
        message || 'Cannot complete remote interaction',
        {description, dismissable: true},
      );
      return null;
    }
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
