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
              disabled={!this.props.remoteName || this.props.pullDisabled || this.props.inProgress}>
              <Tooltip
                active={this.props.pullDisabled}
                text="Commit changes before pulling"
                className="btn-tooltip-wrapper">
                <span className="icon icon-arrow-down" />
                <span ref="behindCount">Pull {this.props.behindCount ? `(${this.props.behindCount})` : ''}</span>
              </Tooltip>
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
      this.errorMessage = errorTransform(error.stdErr);
    }
    return etch.update(this);
  }

  @autobind
  async fetch() {
    await this.attemptGitOperation(() => this.props.fetch());
  }

  @autobind
  async pull() {
    await this.attemptGitOperation(() => this.props.pull());
  }

  @autobind
  async push(event) {
    await this.attemptGitOperation(
      () => this.props.push({force: event.metaKey, setUpstream: !this.props.remoteName}),
      message => {
        if (/rejected[\s\S]*failed to push/.test(message)) {
          return 'Push rejected. ' +
            'Try pulling before pushing again. Or, to force push, hold `cmd` while clicking.';
        }

        return message;
      },
    );
  }
}

class Tooltip {
  constructor({active, text, ...otherProps}, children) {
    this.active = active;
    this.text = text;
    this.children = children;
    this.otherProps = otherProps;
    this.handleMouseOut = this.handleMouseOut;
    this.handleMouseOver = this.handleMouseOver;
    etch.initialize(this);
  }

  update({active, text, ...otherProps}, children) {
    this.active = active;
    this.text = text;
    this.children = children;
    this.otherProps = otherProps;
    return etch.update(this);
  }

  @autobind
  handleMouseOut() {
    if (this.tooltipDisposable) {
      this.tooltipDisposable.dispose();
      this.tooltipDisposable = null;
    }
  }

  @autobind
  handleMouseOver() {
    if (this.active && !this.tooltipDisposable) {
      const element = this.element;
      this.tooltipDisposable = atom.tooltips.add(element, {title: this.text, trigger: 'manual'});
    }
  }

  render() {
    return (
      <div {...this.otherProps} onmouseover={this.handleMouseOver} onmouseout={this.handleMouseOut}>
        {this.children}
      </div>
    );
  }

  destroy() {
    this.tooltipDisposable && this.tooltipDisposable.dispose();
    etch.destroy(this);
  }
}
