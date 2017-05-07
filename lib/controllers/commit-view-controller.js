/** @jsx etch.dom */
/* eslint react/no-unknown-property: "off" */

import etch from 'etch';
import {autobind} from 'core-decorators';

import CommitView from '../views/commit-view';
import ModelStateRegistry from '../models/model-state-registry';

export default class CommitViewController {
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

    if (this.props.isMerging && this.props.mergeMessage) {
      this.regularCommitMessage = this.props.mergeMessage;
    }
    etch.initialize(this);
  }

  update(props) {
    const wasAmending = this.props.isAmending;
    const wasMerging = this.props.isMerging;
    this.props = {...this.props, ...props};
    this.repoStateRegistry.setModel(this.props.repository);
    // If we just checked the "amend" box and we don't yet have a saved amending message,
    // initialize it to be the message from the last commit.
    if (!wasAmending && this.props.isAmending && !this.amendingCommitMessage && this.props.lastCommit.isPresent()) {
      this.amendingCommitMessage = props.lastCommit.getMessage();
    } else if (!wasMerging && this.props.isMerging && !this.regularCommitMessage) {
      this.regularCommitMessage = this.props.mergeMessage || '';
    }
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
    const message = this.props.isAmending ? this.amendingCommitMessage : this.regularCommitMessage;
    return message || '';
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

  focus() {
    this.refs.commitView.focus();
  }

  isFocused() {
    return this.refs.commitView.isFocused();
  }

  destroy() {
    this.repoStateRegistry.save();
    return etch.destroy(this);
  }
}
