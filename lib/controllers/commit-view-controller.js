/** @babel */
/** @jsx etch.dom */
/* eslint react/no-unknown-property: "off" */

import etch from 'etch';

import CommitView from '../views/commit-view';
import ModelStateTracker from '../models/model-state-tracker';

const viewStateByRepository = new ModelStateTracker({
  serialize: (_model, controller) => {
    return {
      regularCommitMessage: controller.regularCommitMessage,
      amendingCommitMessage: controller.amendingCommitMessage,
    };
  },
  deserialize: (state = {}, repo, controller) => {
    if (controller) {
      controller.regularCommitMessage = state.regularCommitMessage || '';
      controller.amendingCommitMessage = state.amendingCommitMessage || '';
    }
  },
});
export default class CommitViewController {
  constructor(props) {
    this.props = props;

    this.commit = this.commit.bind(this);
    this.handleMessageChange = this.handleMessageChange.bind(this);
    viewStateByRepository.setContext(this);
    viewStateByRepository.setModel(props.repository);

    etch.initialize(this);
  }

  update(props) {
    if (this.props.repository !== props.repository) {
      viewStateByRepository.setModel(props.repository);
    }
    this.props = props;
    etch.update(this);
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

  destroy() {
    viewStateByRepository.setModel(null);
    return etch.destroy(this);
  }
}
