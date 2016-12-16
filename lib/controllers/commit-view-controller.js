/** @babel */
/** @jsx etch.dom */
/* eslint react/no-unknown-property: "off" */

import etch from 'etch';

import CommitView from '../views/commit-view';
import ModelStateRegistry from '../models/model-state-registry';

export default class CommitViewController {
  constructor(props) {
    this.props = props;

    this.commit = this.commit.bind(this);
    this.handleMessageChange = this.handleMessageChange.bind(this);
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
    let message = this.regularCommitMessage;
    if (this.props.isAmending) {
      message = this.amendingCommitMessage;
      if (!message.length && this.props.lastCommit) {
        message = this.props.lastCommit.message;
      }
    } else if (!message.length && this.props.mergeMessage) {
      message = this.props.mergeMessage;
    }
    return (
      <CommitView
        ref="commitView"
        stagedChangesExist={this.props.stagedChangesExist}
        mergeConflictsExist={this.props.mergeConflictsExist}
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

  async commit(message) {
    await this.props.commit(message);
    this.regularCommitMessage = '';
    this.amendingCommitMessage = '';
    etch.update(this);
  }

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
