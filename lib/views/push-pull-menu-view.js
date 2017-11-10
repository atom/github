import React from 'react';
import PropTypes from 'prop-types';
import {autobind} from 'core-decorators';

import {BranchPropType, RemotePropType} from '../prop-types';

export default class PushPullMenuView extends React.Component {
  static propTypes = {
    currentBranch: BranchPropType.isRequired,
    currentRemote: RemotePropType.isRequired,
    inProgress: PropTypes.bool,
    aheadCount: PropTypes.number,
    behindCount: PropTypes.number,
    onMarkSpecialClick: PropTypes.func.isRequired,
    fetch: PropTypes.func.isRequired,
    push: PropTypes.func.isRequired,
    pull: PropTypes.func.isRequired,
    originExists: PropTypes.bool.isRequired,
  }

  static defaultProps = {
    inProgress: false,
    onMarkSpecialClick: () => {},
  }

  constructor(props, context) {
    super(props, context);

    this.state = {
      errorMessage: '',
    };
  }

  render() {
    const errorMessage = this.getErrorMessage();
    const fetchDisabled = !this.props.currentRemote.isPresent()
      || this.props.inProgress;
    const pullDisabled = !this.props.currentRemote.isPresent()
      || this.props.currentBranch.isDetached()
      || this.props.inProgress;
    const pushDisabled = this.props.currentBranch.isDetached()
      || (!this.props.currentRemote.isPresent() && !this.props.originExists)
      || this.props.inProgress;

    return (
      <div className={'github-PushPullMenuView' + (this.props.inProgress ? ' in-progress' : '')}>
        <div className="github-PushPullMenuView-selector">
          <span className="github-PushPullMenuView-item icon icon-mark-github" onClick={this.handleIconClick} />
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

    if (this.props.currentBranch.isDetached()) {
      return 'Note: you are not on a branch. Please create one if you wish to push your work anywhere.';
    }

    if (!this.props.currentRemote.isPresent()) {
      if (this.props.originExists) {
        return `Note: No remote detected for branch ${this.props.currentBranch.getName()}. ` +
          'Pushing will set up a remote tracking branch on remote repo "origin"';
      } else {
        return `Note: No remote detected for branch ${this.props.currentBranch.getName()}. ` +
          'Cannot push because there is no remote named "origin" for which to create a remote tracking branch.';
      }
    }

    return '';
  }

  @autobind
  handleIconClick(evt) {
    if (evt.shiftKey) {
      this.props.onMarkSpecialClick();
    }
  }

  @autobind
  fetch() {
    try {
      return this.props.fetch();
    } catch (e) {
      return null;
    }
  }

  @autobind
  pull() {
    try {
      return this.props.pull();
    } catch (e) {
      return null;
    }
  }

  @autobind
  async push(evt) {
    try {
      await this.props.push({force: evt.metaKey || evt.ctrlKey, setUpstream: !this.props.currentRemote.isPresent()});
    } catch (e) {
      // do nothing
    }
  }
}
