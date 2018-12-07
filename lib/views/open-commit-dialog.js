import React from 'react';
import PropTypes from 'prop-types';
import {CompositeDisposable} from 'event-kit';

import Commands, {Command} from '../atom/commands';
import {GitError} from '../git-shell-out-strategy';

const shaRx = /^[a-fA-F0-9]{0,40}$/;

export default class OpenCommitDialog extends React.Component {
  static propTypes = {
    commandRegistry: PropTypes.object.isRequired,
    didAccept: PropTypes.func.isRequired,
    didCancel: PropTypes.func.isRequired,
    repository: PropTypes.object.isRequired,
  }

  constructor(props, context) {
    super(props, context);

    this.state = {
      error: null,
    };
    this.subs = new CompositeDisposable();
  }

  componentDidMount() {
    setTimeout(() => this.commitShaElement.focus());
  }

  componentWillUnmount() {
    this.subs.dispose();
  }

  render() {
    return this.renderDialog();
  }

  renderDialog() {
    return (
      <div className="github-Dialog github-OpenCommit modal">
        <Commands registry={this.props.commandRegistry} target=".github-OpenCommit">
          <Command command="core:cancel" callback={this.cancel} />
          <Command command="core:confirm" callback={this.accept} />
        </Commands>
        <main className="github-DialogInputs">
          <label className="github-DialogLabel github-CommitSha">
            Commit sha:
            <atom-text-editor mini={true} ref={this.editorRefs('commitSha')} tabIndex="1" />
          </label>
          {this.state.error && <span className="error">{this.state.error}</span>}
        </main>
        <div className="github-DialogButtons">
          <button className="btn github-CancelButton" onClick={this.cancel} tabIndex="3">
            Cancel
          </button>
          <button
            className="btn btn-primary icon icon-commit"
            onClick={this.accept}
            disabled={!!this.state.error || this.getCommitSha().length === 0}
            tabIndex="2">
            Open Commit
          </button>
        </div>
      </div>
    );
  }

  accept = async () => {
    const sha = this.getCommitSha();
    await this.ensureCommitExists(sha);
    if (!this.state.error) {
      this.props.didAccept({sha});
    }
  }

  cancel = () => this.props.didCancel()

  editorRefs = baseName => {
    const elementName = `${baseName}Element`;
    const modelName = `${baseName}Editor`;
    const subName = `${baseName}Subs`;
    const changeMethodName = `didChange${baseName[0].toUpperCase()}${baseName.substring(1)}`;

    return element => {
      if (!element) {
        return;
      }

      this[elementName] = element;
      const editor = element.getModel();
      if (this[modelName] !== editor) {
        this[modelName] = editor;

        /* istanbul ignore if */
        if (this[subName]) {
          this[subName].dispose();
          this.subs.remove(this[subName]);
        }

        this[subName] = editor.onDidChange(this[changeMethodName]);
        this.subs.add(this[subName]);
      }
    };
  }

  ensureCommitExists = async () => {
    try {
      await this.props.repository.getCommit(this.getCommitSha());
    } catch (error) {
      if (error instanceof GitError && error.code === 128) {
        this.setState({error: 'Commit with that sha does not exist in this repository'});
      } else {
        throw error;
      }
    }
  }

  didChangeCommitSha = () => new Promise(resolve => {
    const error = shaRx.test(this.getCommitSha()) ? null : 'Not a valid git commit identifier';
    this.setState({error}, resolve);
  })

  getCommitSha() {
    return this.commitShaEditor ? this.commitShaEditor.getText() : '';
  }
}
