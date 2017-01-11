/** @jsx etch.dom */
/* eslint react/no-unknown-property: "off" */

import {CompositeDisposable, TextEditor} from 'atom';

import etch from 'etch';
import {autobind} from 'core-decorators';

import {shortenSha} from '../helpers';

export default class CommitView {
  constructor(props) {
    this.props = props;

    etch.initialize(this);

    this.editor = this.refs.editor;
    // FIXME Use props-injected view registry instead of the Atom global
    this.editorElement = atom.views.getView(this.editor);
    this.editor.setText(this.props.message || '');
    this.subscriptions = new CompositeDisposable(
      this.editor.onDidChange(() => this.props.onChangeMessage && this.props.onChangeMessage(this.editor.getText())),
      this.editor.onDidChangeCursorPosition(() => { etch.update(this); }),
      props.commandRegistry.add('atom-workspace', {'github:commit': this.commit}),
    );
  }

  destroy() {
    this.subscriptions.dispose();
    etch.destroy(this);
  }

  update(props) {
    const previousMessage = this.props.message;
    this.props = {...this.props, ...props};
    const newMessage = this.props.message;
    if (this.editor && previousMessage !== newMessage && this.editor.getText() !== newMessage) {
      this.editor.setText(newMessage);
    }
    return etch.update(this);
  }

  render() {
    let remainingCharsClassName = '';
    if (this.getRemainingCharacters() < 0) {
      remainingCharsClassName = 'is-error';
    } else if (this.getRemainingCharacters() < this.props.maximumCharacterLimit / 4) {
      remainingCharsClassName = 'is-warning';
    }
    return (
      <div className="github-CommitView" ref="CommitView">
        <div className="github-CommitView-editor">
          <TextEditor
            ref="editor"
            softWrapped={true}
            placeholderText="Commit message"
            lineNumberGutterVisible={false}
            showInvisibles={false}
            autoHeight={false}
            scrollPastEnd={false}
          />
        </div>
        <footer className="github-CommitView-bar">
          <button ref="abortMergeButton" className="btn github-CommitView-button is-secondary"
            onclick={this.abortMerge}
            style={{display: this.props.isMerging ? '' : 'none'}}>Abort Merge</button>
          <label className="github-CommitView-label input-label" style={{display: this.props.isMerging ? 'none' : ''}}>
            <input
              ref="amend"
              className="input-checkbox"
              type="checkbox"
              onclick={this.handleAmendBoxClick}
              checked={this.props.isAmending}
            /> Amend
          </label>
          <button ref="commitButton" className="btn github-CommitView-button"
            onclick={this.commit}
            disabled={!this.isCommitButtonEnabled()}>{this.commitButtonText()}</button>
          <div ref="remainingCharacters"
            className={`github-CommitView-remaining-characters ${remainingCharsClassName}`}>
            {this.getRemainingCharacters()}
          </div>
        </footer>
      </div>
    );
  }

  @autobind
  abortMerge() {
    this.props.abortMerge();
  }

  @autobind
  handleAmendBoxClick() {
    this.props.setAmending(this.refs.amend.checked);
  }

  @autobind
  async commit() {
    if (await this.props.prepareToCommit() && this.isCommitButtonEnabled()) {
      this.props.commit(this.editor.getText());
    } else {
      this.focus();
    }
  }

  getRemainingCharacters() {
    if (this.editor != null) {
      if (this.editor.getCursorBufferPosition().row === 0) {
        return (this.props.maximumCharacterLimit - this.editor.lineTextForBufferRow(0).length).toString();
      } else {
        return '∞';
      }
    } else {
      return this.props.maximumCharacterLimit;
    }
  }

  isCommitButtonEnabled() {
    return this.props.stagedChangesExist &&
      !this.props.mergeConflictsExist &&
      this.editor &&
      this.editor.getText().length !== 0;
  }

  commitButtonText() {
    if (this.props.isAmending) {
      return `Amend commit (${shortenSha(this.props.lastCommit.sha)})`;
    } else {
      if (this.props.branchName) {
        return `Commit to ${this.props.branchName}`;
      } else {
        return 'Commit';
      }
    }
  }

  focus() {
    this.editorElement.focus();
  }

  isFocused() {
    return this.element === document.activeElement || this.element.contains(document.activeElement);
  }
}
