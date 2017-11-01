/** @jsx etch.dom */
/* eslint react/no-unknown-property: "off" */

import path from 'path';

import etch from 'etch';
import {autobind} from 'core-decorators';
import {CompositeDisposable} from 'event-kit';

import CommitView from '../views/commit-view';
import {writeFile, readFile} from '../helpers';

export const COMMIT_GRAMMAR_SCOPE = 'text.git-commit';

export default class CommitViewController {
  static focus = {
    ...CommitView.focus,
  }

  constructor(props) {
    this.props = props;

    if (this.props.isMerging && this.props.mergeMessage) {
      this.props.repository.setRegularCommitMessage(this.props.mergeMessage);
    }

    this.subscriptions = new CompositeDisposable();
    etch.initialize(this);
    this.subscriptions.add(
      this.props.workspace.onDidAddTextEditor(({textEditor}) => {
        if (this.props.repository.isPresent() && textEditor.getPath() === this.getCommitMessagePath()) {
          const grammar = this.props.grammars.grammarForScopeName(COMMIT_GRAMMAR_SCOPE);
          if (grammar) {
            textEditor.setGrammar(grammar);
          }
        }
        etch.update(this);
      }),
      this.props.workspace.onDidDestroyPaneItem(async ({item}) => {
        if (this.props.repository.isPresent() && item.getPath && item.getPath() === this.getCommitMessagePath() &&
            this.getCommitMessageEditors().length === 0) {
          // we closed the last editor pointing to the commit message file
          try {
            if (this.props.isAmending && this.props.lastCommit.isPresent()) {
              this.setAmendingCommitMessage(await readFile(this.getCommitMessagePath()));
            } else {
              this.setRegularCommitMessage(await readFile(this.getCommitMessagePath()));
            }
          } catch (e) {
            if (e.code !== 'ENOENT') {
              throw e;
            }
          } finally {
            // update even if the file was deleted
            etch.update(this);
          }
        }
      }),
    );
  }

  update(props) {
    const wasAmending = this.props.isAmending;
    const wasMerging = this.props.isMerging;
    this.props = {...this.props, ...props};
    // If we just checked the "amend" box and we don't yet have a saved amending message,
    // initialize it to be the message from the last commit.
    const switchToAmending = !wasAmending && this.props.isAmending;
    if (switchToAmending && !this.getAmendingCommitMessage() && this.props.lastCommit.isPresent()) {
      this.setAmendingCommitMessage(props.lastCommit.getMessage());
    } else if (!wasMerging && this.props.isMerging && !this.getRegularCommitMessage()) {
      this.setRegularCommitMessage(this.props.mergeMessage || '');
    }
    return etch.update(this);
  }

  render() {
    const message = this.getCommitMessage();
    const isCommitting = this.props.repository.getOperationStates().commitInProgress;

    return (
      <CommitView
        ref="commitView"
        stagedChangesExist={this.props.stagedChangesExist}
        mergeConflictsExist={this.props.mergeConflictsExist}
        prepareToCommit={this.props.prepareToCommit}
        commit={this.commit}
        setAmending={this.setAmending}
        abortMerge={this.props.abortMerge}
        branchName={this.props.branchName}
        commandRegistry={this.props.commandRegistry}
        maximumCharacterLimit={72}
        message={message}
        isMerging={this.props.isMerging}
        isAmending={this.props.isAmending}
        isCommitting={isCommitting}
        lastCommit={this.props.lastCommit}
        onChangeMessage={this.handleMessageChange}
        didMoveUpOnFirstLine={this.props.didMoveUpOnFirstLine}
        toggleExpandedCommitMessageEditor={this.toggleExpandedCommitMessageEditor}
        deactivateCommitBox={!!this.getCommitMessageEditors().length > 0}
      />
    );
  }

  @autobind
  setAmending(amending) {
    this.props.repository.setAmending(amending);
  }

  @autobind
  async commit(message) {
    // TODO: better way? can this logic just reside in the pipeline registry
    if (this.getCommitMessageEditors().length > 0) {
      await this.props.commit({filePath: this.getCommitMessagePath()});
    } else {
      await this.props.commit(message);
    }
  }

  getCommitMessage() {
    const message = this.props.isAmending ? this.getAmendingCommitMessage() : this.getRegularCommitMessage();
    return message || '';
  }

  setAmendingCommitMessage(message) {
    this.props.repository.setAmendingCommitMessage(message);
  }

  getAmendingCommitMessage() {
    return this.props.repository.getAmendingCommitMessage();
  }

  setRegularCommitMessage(message) {
    this.props.repository.setRegularCommitMessage(message);
  }

  getRegularCommitMessage() {
    return this.props.repository.getRegularCommitMessage();
  }

  getCommitMessagePath() {
    return path.join(this.props.repository.getGitDirectoryPath(), 'ATOM_COMMIT_EDITMSG');
  }

  @autobind
  handleMessageChange(newMessage) {
    if (!this.props.repository.isPresent()) {
      return;
    }
    if (this.props.isAmending) {
      this.setAmendingCommitMessage(newMessage);
    } else {
      this.setRegularCommitMessage(newMessage);
    }
    etch.update(this);
  }

  getCommitMessageEditors() {
    if (!this.props.repository.isPresent()) {
      return [];
    }
    return this.props.workspace.getTextEditors().filter(editor => editor.getPath() === this.getCommitMessagePath());
  }

  @autobind
  toggleExpandedCommitMessageEditor(messageFromBox) {
    if (this.getCommitMessageEditors().length > 0) {
      if (this.commitMessageEditorIsInForeground()) {
        this.closeAllOpenCommitMessageEditors();
      } else {
        this.activateCommitMessageEditor();
      }
    } else {
      this.openCommitMessageEditor(messageFromBox);
    }
  }

  commitMessageEditorIsInForeground() {
    const commitMessageEditorsInForeground = this.props.workspace.getPanes()
      .map(pane => pane.getActiveItem())
      .filter(item => item && item.getPath && item.getPath() === this.getCommitMessagePath());
    return commitMessageEditorsInForeground.length > 0;
  }

  activateCommitMessageEditor() {
    const panes = this.props.workspace.getPanes();
    let editor;
    const paneWithEditor = panes.find(pane => {
      editor = pane.getItems().find(item => item.getPath && item.getPath() === this.getCommitMessagePath());
      return !!editor;
    });
    paneWithEditor.activate();
    paneWithEditor.activateItem(editor);
  }

  closeAllOpenCommitMessageEditors() {
    this.props.workspace.getPanes().forEach(pane => {
      pane.getItems().forEach(async item => {
        if (item && item.getPath && item.getPath() === this.getCommitMessagePath()) {
          const destroyed = await pane.destroyItem(item);
          if (!destroyed) {
            pane.activateItem(item);
          }
        }
      });
    });
  }

  async openCommitMessageEditor(messageFromBox) {
    await writeFile(this.getCommitMessagePath(), messageFromBox, 'utf8');
    const commitEditor = await this.props.workspace.open(this.getCommitMessagePath());

    const grammar = this.props.grammars.grammarForScopeName(COMMIT_GRAMMAR_SCOPE);
    if (grammar) {
      commitEditor.setGrammar(grammar);
    } else {
      this.grammarSubscription = this.props.grammars.onDidAddGrammar(this.grammarAdded);
      this.subscriptions.add(this.grammarSubscription);
    }
    etch.update(this);
  }

  @autobind
  grammarAdded(grammar) {
    if (grammar.scopeName !== COMMIT_GRAMMAR_SCOPE) { return; }

    this.getCommitMessageEditors().forEach(editor => editor.setGrammar(grammar));
    this.grammarSubscription.dispose();
  }

  rememberFocus(event) {
    return this.refs.commitView.rememberFocus(event);
  }

  setFocus(focus) {
    return this.refs.commitView.setFocus(focus);
  }

  hasFocus() {
    return this.element.contains(document.activeElement);
  }

  destroy() {
    this.subscriptions.dispose();
    return etch.destroy(this);
  }
}
