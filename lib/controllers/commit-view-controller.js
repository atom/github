/** @jsx etch.dom */
/* eslint react/no-unknown-property: "off" */

import path from 'path';

import etch from 'etch';
import {autobind} from 'core-decorators';
import {CompositeDisposable} from 'event-kit';

import CommitView from '../views/commit-view';
import ModelStateRegistry from '../models/model-state-registry';
import {readFile} from '../helpers';

export const COMMIT_GRAMMAR_SCOPE = 'text.git-commit';

export default class CommitViewController {
  static focus = {
    ...CommitView.focus,
  }

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

    this.subscriptions = new CompositeDisposable();
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
        openCommitEditor={this.openCommitEditor}
        deactivateCommitBox={!!this.commitEditor}
      />
    );
  }

  @autobind
  async commit(message) {
    try {
      if (this.commitEditor) {
        await this.props.commit({filePath: this.getCommitMessagePath()});
      } else {
        await this.props.commit(message);
      }
      this.regularCommitMessage = '';
      this.amendingCommitMessage = '';
      etch.update(this);
    } catch (e) {
      this.props.notificationManager.addError('Unable to commit', {
        dismissable: true,
        description: `<pre>${e.stdErr || e.stack}</pre>`,
      });
    }
  }

  getCommitMessage() {
    const message = this.props.isAmending ? this.amendingCommitMessage : this.regularCommitMessage;
    return message || '';
  }

  getCommitMessagePath() {
    return path.join(this.props.repository.getGitDirectoryPath(), 'ATOM_COMMIT_EDITMSG');
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

  activateCommitEditor() {
    const panes = this.props.workspace.getPanes();
    const paneWithEditor = panes.find(pane => {
      const editor = pane.getItems().find(item => item === this.commitEditor);
      return !!editor;
    });
    paneWithEditor.activate();
    paneWithEditor.activateItem(this.commitEditor);
  }

  @autobind
  async openCommitEditor(messageFromBox) {
    if (this.commitEditor) {
      this.activateCommitEditor();
      return;
    }

    this.commitEditor = await this.props.workspace.open(this.getCommitMessagePath());
    this.commitEditor.setText(messageFromBox);

    const grammar = this.props.grammars.grammarForScopeName(COMMIT_GRAMMAR_SCOPE);
    if (grammar) {
      this.commitEditor.setGrammar(grammar);
    } else {
      this.grammarSubscription = this.props.grammars.onDidAddGrammar(this.grammarAdded);
      this.subscriptions.add(this.grammarSubscription);
    }
    etch.update(this);

    this.editorSubscription = this.commitEditor.onDidDestroy(async () => {
      this.commitEditor = null;
      const contents = await readFile(this.getCommitMessagePath());
      this.regularCommitMessage = contents;
      this.editorSubscription.dispose();
      etch.update(this);
    });
    this.subscriptions.add(this.editorSubscription);
  }

  @autobind
  grammarAdded(grammar) {
    if (grammar.scopeName !== COMMIT_GRAMMAR_SCOPE) { return; }

    this.commitEditor.setGrammar(grammar);
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
    this.repoStateRegistry.save();
    return etch.destroy(this);
  }
}
