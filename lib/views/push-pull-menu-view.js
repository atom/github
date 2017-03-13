import React from 'react';
import {autobind} from 'core-decorators';

import {GitError} from '../git-shell-out-strategy';
import {BranchPropType} from '../prop-types';

export default class PushPullMenuView extends React.Component {
  static propTypes = {
    inProgress: React.PropTypes.bool,
    currentBranch: BranchPropType,
    remoteName: React.PropTypes.string,
    aheadCount: React.PropTypes.number,
    behindCount: React.PropTypes.number,
    notificationManager: React.PropTypes.object,
    fetch: React.PropTypes.func,
    push: React.PropTypes.func,
    pull: React.PropTypes.func,
  }

  static defaultProps = {
    inProgress: false,
    currentBranch: {
      name: '',
      isDetached: false,
    },
  }

  constructor(props, context) {
    super(props, context);

    this.state = {
      force: false,
      errorMessage: '',
    };
  }

  getKeyEventTarget() {
    return document.querySelector('atom-workspace') || document;
  }

  componentDidMount() {
    this.getKeyEventTarget().addEventListener('keydown', this.handleForceKeys);
    this.getKeyEventTarget().addEventListener('keyup', this.handleForceKeys);
  }

  componentWillUnmount() {
    this.getKeyEventTarget().removeEventListener('keydown', this.handleForceKeys);
    this.getKeyEventTarget().removeEventListener('keyup', this.handleForceKeys);
  }

  @autobind
  handleForceKeys(e) {
    if (e.metaKey || e.ctrlKey) {
      this.setState({force: true});
    } else {
      this.setState({force: false});
    }
  }

  render() {
    const errorMessage = this.getErrorMessage();
    const fetchDisabled = !this.props.remoteName || this.props.inProgress;
    const pullDisabled = !this.props.remoteName || this.props.currentBranch.isDetached || this.props.inProgress;
    const pushDisabled = this.props.currentBranch.isDetached || this.props.inProgress;

    return (
      <div className={'github-PushPullMenuView' + (this.props.inProgress ? ' in-progress' : '')}>
        <div className="github-PushPullMenuView-selector">
          <span className="github-PushPullMenuView-item icon icon-mark-github" />
          <button className="github-PushPullMenuView-item btn" onClick={this.fetch} disabled={fetchDisabled}>
            Fetch
          </button>

          <div className="github-PushPullMenuView-item is-flexible btn-group">
            <button className="btn github-PushPullMenuView-pull" onClick={this.pull} disabled={pullDisabled}>
              <span className="icon icon-arrow-down" />
              <span>
                Pull {this.props.behindCount ? `(${this.props.behindCount})` : ''}
              </span>
            </button>
            <button className="btn github-PushPullMenuView-push" onClick={this.push} disabled={pushDisabled}>
              <span className="icon icon-arrow-up" />
              <span>
                {this.state.force ? 'Force' : ''} Push {this.props.aheadCount ? `(${this.props.aheadCount})` : ''}
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

    if (this.props.currentBranch.isDetached) {
      return 'Note: you are not on a branch. Please create one if you wish to push your work anywhere.';
    }

    if (!this.props.remoteName) {
      return `Note: No remote detected for branch ${this.props.currentBranch.name}. ` +
        'Pushing will set up a remote tracking branch on remote repo "origin"';
    }

    return '';
  }

  async attemptGitOperation(operation, errorTransform = message => ({message})) {
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
    await this.attemptGitOperation(
      () => this.props.fetch(),
      description => {
        return {
          message: 'Unable to fetch',
          description: `<pre>${description}</pre>`,
        };
      },
    );
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
  async push() {
    await this.attemptGitOperation(
      () => this.props.push({force: this.state.force, setUpstream: !this.props.remoteName}),
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
