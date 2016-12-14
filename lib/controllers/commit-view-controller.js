/** @babel */
/** @jsx etch.dom */
/* eslint react/no-unknown-property: "off" */

import etch from 'etch';

import CommitView from '../views/commit-view';

const viewStateByRepository = new WeakMap();
export default class CommitViewController {
  constructor(props) {
    this.props = props;
    this.loadViewState(props.repository);

    this.commit = this.commit.bind(this);
    this.handleMessageChange = this.handleMessageChange.bind(this);

    etch.initialize(this);
  }

  update(props) {
    if (this.props.repository !== props.repository) {
      this.saveViewState(this.props.repository);
      this.loadViewState(props.repository);
    }
    if (this.props.lastCommit !== props.lastCommit) {
      this.amendingCommitMessage = props.lastCommit && props.lastCommit.message;
    }
    this.props = props;
    etch.update(this);
  }

  saveViewState(repository) {
    if (repository) {
      const viewState = {
        regularCommitMessage: this.regularCommitMessage,
        amendingCommitMessage: this.amendingCommitMessage,
      };
      viewStateByRepository.set(repository, viewState);
    }
  }

  loadViewState(repository) {
    let viewState = {};
    if (repository && viewStateByRepository.has(repository)) {
      viewState = viewStateByRepository.get(repository);
    }
    this.regularCommitMessage = viewState.regularCommitMessage || '';
    this.amendingCommitMessage = viewState.amendingCommitMessage || '';
  }

  render() {
    let message = this.props.isAmending ? this.amendingCommitMessage : this.regularCommitMessage;
    if (this.props.mergeMessage && message === '') {
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
    this.saveViewState(this.props.repository);
    return etch.destroy(this);
  }
}
