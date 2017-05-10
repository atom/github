/** @jsx etch.dom */
/* eslint react/no-unknown-property: "off" */

import etch from 'etch';
import {autobind} from 'core-decorators';

import CommitView from '../views/commit-view';
import ModelStateRegistry from '../models/model-state-registry';

export default class CommitViewController {
  static focus = {
    ...CommitView.focus,
  }

  constructor(props) {
    this.props = props;

    this.repoStateRegistry = new ModelStateRegistry(CommitViewController, {
      initialModel: props.repository,
      save: () => {
        return {
          regularCommitMessage: this.regularCommitMessage,
          amendingCommitMessage: this.amendingCommitMessage,
        };
      },
      restore: (state = {}) => {
        this.regularCommitMessage = state.regularCommitMessage || '';
        this.amendingCommitMessage = state.amendingCommitMessage || '';
      },
    });

    etch.initialize(this);
  }

  update(props) {
    this.props = {...this.props, ...props};
    this.repoStateRegistry.setModel(this.props.repository);
    return etch.update(this);
  }

  render() {
    const message = this.getCommitMessage();

    return (
      <CommitView
        ref="commitView"
        stagedChangesExist={this.props.stagedChangesExist}
        mergeConflictsExist={this.props.mergeConflictsExist}
        prepareToCommit={this.props.prepareToCommit}
        commit={this.commit}
        setAmending={this.props.setAmending}
        abortMerge={this.props.abortMerge}
        branchName={this.props.branchName}
        commandRegistry={this.props.commandRegistry}
        maximumCharacterLimit={72}
        message={message}
        isMerging={this.props.isMerging}
        isAmending={this.props.isAmending}
        lastCommit={this.props.lastCommit}
        onChangeMessage={this.handleMessageChange}
        didMoveUpOnFirstLine={this.props.didMoveUpOnFirstLine}
      />
    );
  }

  @autobind
  async commit(message) {
    await this.props.commit(message);
    this.regularCommitMessage = '';
    this.amendingCommitMessage = '';
    etch.update(this);
  }

  getCommitMessage() {
    let message = this.regularCommitMessage;
    if (this.props.isAmending) {
      message = this.amendingCommitMessage;
      if (!message.length && this.props.lastCommit.isPresent()) {
        message = this.props.lastCommit.getMessage();
      }
    } else if (!message.length && this.props.mergeMessage) {
      message = this.props.mergeMessage;
    }
    return message;
  }

  @autobind
  handleMessageChange(newMessage) {
    if (this.props.isAmending) {
      this.amendingCommitMessage = newMessage;
    } else {
      this.regularCommitMessage = newMessage;
    }
    etch.update(this);
  }

  rememberFocus(event) {
    return this.refs.commitView.rememberFocus(event);
  }

  restoreFocus(focus) {
    return this.refs.commitView.restoreFocus(focus);
  }

  destroy() {
    this.repoStateRegistry.save();
    return etch.destroy(this);
  }
}
