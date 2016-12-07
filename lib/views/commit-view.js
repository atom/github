/** @babel */
/** @jsx etch.dom */
/* eslint react/no-unknown-property: "off" */

import {CompositeDisposable, TextEditor} from 'atom';
import etch from 'etch';
import {shortenSha} from '../helpers';

const COMMIT_GRAMMAR_SCOPE = 'text.git-commit'

export default class CommitView {
  constructor(props) {
    this.props = props;
    this.abortMerge = this.abortMerge.bind(this);
    this.handleAmendBoxClick = this.handleAmendBoxClick.bind(this);
    etch.initialize(this);
    this.editor = this.refs.editor;
    this.subscriptions = new CompositeDisposable(
      this.editor.onDidChangeCursorPosition(() => { etch.update(this); }),
      this.editor.getBuffer().onDidChangeText(() => { etch.update(this); }),
      props.commandRegistry.add(this.element, {'git:commit': () => this.commit()})
    );
    this.setMessageAndAmendStatus();
    this.updateStateForRepository();

    const grammar = atom.grammars.grammarForScopeName(COMMIT_GRAMMAR_SCOPE);
    if (grammar) {
      this.editor.setGrammar(grammar);
    } else {
      const sub = atom.grammars.onDidAddGrammar(this.grammarAdded.bind(this));
      this.grammarSubscription = sub;
      this.subscriptions.add(sub);
    }
  }

  destroy() {
    this.subscriptions.dispose();
    etch.destroy(this);
  }

  update(props) {
    this.props = {...this.props, ...props};
    this.setMessageAndAmendStatus();
    return etch.update(this);
  }

  grammarAdded (grammar) {
    if (grammar.scopeName !== COMMIT_GRAMMAR_SCOPE) {
      return;
    }

    this.editor.setGrammar(grammar);
    this.grammarSubscription.dispose();
  }

  setMessageAndAmendStatus () {
    const viewState = this.props.viewState || {};
    message = viewState.message || '';
    if (this.props.message && message === '') {
      this.editor.setText(this.props.message);
      this.editor.setCursorBufferPosition([0, 0]);
    } else {
      this.editor.setText(message || '');
      if (viewState.cursorPosition) { this.editor.setCursorBufferPosition(viewState.cursorPosition); }
    }
    this.refs.amend.checked = Boolean(viewState.amendInProgress);
  }

  updateStateForRepository() {
    if (this.props.viewState) {
      Object.assign(this.props.viewState, {
        message: this.editor.getText(),
        cursorPosition: this.editor.getCursorBufferPosition(),
        amendInProgress: this.refs.amend.checked,
      });
    }
  }

  readAfterUpdate() {
    this.updateStateForRepository();
  }

  render() {
    let remainingCharsClassName = '';
    if (this.getRemainingCharacters() < 0) {
      remainingCharsClassName = 'is-error';
    } else if (this.getRemainingCharacters() < this.props.maximumCharacterLimit / 4) {
      remainingCharsClassName = 'is-warning';
    }
    return (
      <div className="git-CommitView" ref="CommitView">
        <div className="git-CommitView-editor">
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
        <footer className="git-CommitView-bar">
          <button ref="abortMergeButton" className="btn git-CommitView-button is-secondary"
            onclick={this.abortMerge}
            style={{display: this.props.isMerging ? '' : 'none'}}>Abort Merge</button>
          <label className="git-CommitView-label input-label" style={{display: this.props.isMerging ? 'none' : ''}}>
            <input ref="amend" className="input-checkbox" type="checkbox" onclick={this.handleAmendBoxClick} /> Amend
          </label>
          <button ref="commitButton" className="btn git-CommitView-button"
            onclick={this.commit.bind(this)}
            disabled={!this.isCommitButtonEnabled()}>{this.commitButtonText()}</button>
          <div ref="remainingCharacters" className={`git-CommitView-remaining-characters ${remainingCharsClassName}`}>
            {this.getRemainingCharacters()}
          </div>
        </footer>
      </div>
    );
  }

  async abortMerge() {
    const choice = atom.confirm({
      message: 'Abort merge',
      detailedMessage: 'Are you sure?',
      buttons: ['Abort', 'Cancel'],
    });
    if (choice !== 0) { return null; }

    try {
      await this.props.abortMerge();
      this.editor.setText('');
    } catch (e) {
      if (e.code === 'EDIRTYSTAGED') {
        this.props.notificationManager.addError(`Cannot abort because ${e.path} is both dirty and staged.`);
      }
    }
    return etch.update(this);
  }

  async handleAmendBoxClick() {
    const checked = this.refs.amend.checked;
    const viewState = this.props.viewState || {};
    viewState.amendInProgress = checked;
    if (checked) {
      viewState.messagePriorToAmending = this.editor.getText();
      const lastCommitMessage = this.props.lastCommit ? this.props.lastCommit.message : '';
      this.editor.setText(lastCommitMessage);
    } else {
      this.editor.setText(viewState.messagePriorToAmending || '');
    }
    this.editor.setCursorBufferPosition([0, 0]);
    if (this.props.setAmending) { await this.props.setAmending(checked); }
    return etch.update(this);
  }

  async commit() {
    if (this.isCommitButtonEnabled()) {
      try {
        await this.props.commit(this.editor.getText(), {amend: this.refs.amend.checked});
        this.editor.setText('');
        this.editor.getBuffer().clearUndoStack();
      } catch (e) {
        if (e.code === 'ECONFLICT') {
          this.props.notificationManager.addError('Cannot commit without resolving all the merge conflicts first.');
        }
      }
    }
    this.refs.amend.checked = false;
    return etch.update(this);
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
}
