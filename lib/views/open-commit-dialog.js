import React from 'react';
import PropTypes from 'prop-types';
import {CompositeDisposable} from 'event-kit';

import Commands, {Command} from '../atom/commands';
import {autobind} from '../helpers';

// const COMMIT_SHA_REGEX = /^(?:https?:\/\/)?github.com\/([^/]+)\/([^/]+)\/(?:issues|pull)\/(\d+)/;

export default class OpenCommitDialog extends React.Component {
  static propTypes = {
    commandRegistry: PropTypes.object.isRequired,
    didAccept: PropTypes.func,
    didCancel: PropTypes.func,
  }

  static defaultProps = {
    didAccept: () => {},
    didCancel: () => {},
  }

  constructor(props, context) {
    super(props, context);
    autobind(this, 'accept', 'cancel', 'editorRefs', 'didChangeCommitSha');

    this.state = {
      cloneDisabled: false,
    };

    this.subs = new CompositeDisposable();
  }

  componentDidMount() {
    if (this.commitShaElement) {
      setTimeout(() => this.commitShaElement.focus());
    }
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
            disabled={this.getCommitSha().length === 0}
            tabIndex="2">
            Open Commit
          </button>
        </div>
      </div>
    );
  }

  accept() {
    this.props.didAccept({sha: this.getCommitSha()});
  }

  cancel() {
    this.props.didCancel();
  }

  editorRefs(baseName) {
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

        if (this[subName]) {
          this[subName].dispose();
          this.subs.remove(this[subName]);
        }

        this[subName] = editor.onDidChange(this[changeMethodName]);
        this.subs.add(this[subName]);
      }
    };
  }

  didChangeCommitSha() {
    this.setState({error: null});
  }

  getCommitSha() {
    return this.commitShaEditor ? this.commitShaEditor.getText() : '';
  }
}
