import React from 'react';
import PropTypes from 'prop-types';
import {TextBuffer} from 'atom';

import Commands, {Command} from '../atom/commands';
import AtomTextEditor from '../atom/atom-text-editor';
import CommitDetailItem from '../items/commit-detail-item';
import {GitError} from '../git-shell-out-strategy';
import AutoFocus from '../autofocus';
import {addEvent} from '../reporter-proxy';

export default class OpenCommitDialog extends React.Component {
  static propTypes = {
    // Model
    request: PropTypes.shape({
      getParams: PropTypes.func.isRequired,
      accept: PropTypes.func.isRequired,
      cancel: PropTypes.func.isRequired,
    }).isRequired,
    error: PropTypes.instanceOf(Error),

    // Atom environment
    commands: PropTypes.object.isRequired,
  }

  constructor(props) {
    super(props);

    this.ref = new TextBuffer();
    this.sub = this.ref.onDidChange(this.didChangeRef);

    this.state = {
      openEnabled: false,
    };

    this.autofocus = new AutoFocus();
  }

  render() {
    return (
      <div className="github-Dialog github-OpenCommit modal">
        <Commands registry={this.props.commands} target=".github-Dialog">
          <Command command="core:cancel" callback={this.props.request.cancel} />
          <Command command="core:confirm" callback={this.accept} />
        </Commands>
        <main className="github-DialogForm">
          <label className="github-DialogLabel github-CommitRef">
            Commit sha or ref:
            <AtomTextEditor ref={this.autofocus.target} mini={true} buffer={this.ref} />
          </label>
        </main>
        <footer className="github-DialogFooter">
          <div className="github-DialogInfo">
            {this.props.error && (
              <ul className="error-messages">
                <li>{this.props.error.userMessage || this.props.error.message}</li>
              </ul>
            )}
          </div>
          <div className="github-DialogButtons">
            <button
              className="btn github-Dialog-cancelButton"
              onClick={this.props.request.cancel}>
              Cancel
            </button>
            <button
              className="btn btn-primary icon icon-commit"
              onClick={this.accept}
              disabled={!this.state.openEnabled}>
              Open commit
            </button>
          </div>
        </footer>
      </div>
    );
  }

  componentDidMount() {
    this.autofocus.trigger();
  }

  componentWillUnmount() {
    this.sub.dispose();
  }

  accept = () => {
    const ref = this.ref.getText();
    if (ref.length === 0) {
      return Promise.resolve();
    }

    return this.props.request.accept(ref);
  }

  didChangeRef = () => {
    const enabled = !this.ref.isEmpty();
    if (this.state.openEnabled !== enabled) {
      this.setState({openEnabled: enabled});
    }
  }
}

export async function openCommitDetailItem(ref, {workspace, repository}) {
  try {
    await repository.getCommit(ref);
  } catch (error) {
    if (error instanceof GitError && error.code === 128) {
      error.userMessage = 'There is no commit associated with that reference.';
    }

    throw error;
  }

  const item = await workspace.open(
    CommitDetailItem.buildURI(repository.getWorkingDirectoryPath(), ref),
    {searchAllPanes: true},
  );
  addEvent('open-commit-in-pane', {package: 'github', from: OpenCommitDialog.name});
  return item;
}
