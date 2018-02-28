import path from 'path';

import React from 'react';
import PropTypes from 'prop-types';
import {autobind} from 'core-decorators';
import {CompositeDisposable} from 'event-kit';

import CommitView from '../views/commit-view';
import {writeFile, readFile} from '../helpers';

export const COMMIT_GRAMMAR_SCOPE = 'text.git-commit';

export default class CommitController extends React.Component {
  static focus = {
    ...CommitView.focus,
  }

  static propTypes = {
    workspace: PropTypes.object.isRequired,
    grammars: PropTypes.object.isRequired,
    commandRegistry: PropTypes.object.isRequired,
    config: PropTypes.object.isRequired,
    tooltips: PropTypes.object.isRequired,

    repository: PropTypes.object.isRequired,
    isMerging: PropTypes.bool.isRequired,
    isAmending: PropTypes.bool.isRequired,
    mergeMessage: PropTypes.string,
    mergeConflictsExist: PropTypes.bool.isRequired,
    stagedChangesExist: PropTypes.bool.isRequired,
    lastCommit: PropTypes.object.isRequired,
    currentBranch: PropTypes.object.isRequired,

    prepareToCommit: PropTypes.func.isRequired,
    commit: PropTypes.func.isRequired,
    abortMerge: PropTypes.func.isRequired,
  }

  constructor(props, context) {
    super(props, context);

    this.subscriptions = new CompositeDisposable();
  }

  componentWillMount() {
    this.subscriptions.add(
      this.props.workspace.onDidAddTextEditor(({textEditor}) => {
        if (this.props.repository.isPresent() && textEditor.getPath() === this.getCommitMessagePath()) {
          const grammar = this.props.grammars.grammarForScopeName(COMMIT_GRAMMAR_SCOPE);
          if (grammar) {
            textEditor.setGrammar(grammar);
          }
        }
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
          }
        }
      }),
    );

    if (this.props.isAmending && !this.getAmendingCommitMessage() && this.props.lastCommit.isPresent()) {
      this.setAmendingCommitMessage(this.props.lastCommit.getMessage());
    } else if (this.props.isMerging && !this.getRegularCommitMessage()) {
      this.setRegularCommitMessage(this.props.mergeMessage || '');
    }
  }

  render() {
    const message = this.getCommitMessage();
    const operationStates = this.props.repository.getOperationStates();

    return (
      <CommitView
        ref="commitView"
        tooltips={this.props.tooltips}
        config={this.props.config}
        stagedChangesExist={this.props.stagedChangesExist}
        mergeConflictsExist={this.props.mergeConflictsExist}
        prepareToCommit={this.props.prepareToCommit}
        commit={this.commit}
        setAmending={this.setAmending}
        abortMerge={this.props.abortMerge}
        branchName={''}
        commandRegistry={this.props.commandRegistry}
        maximumCharacterLimit={72}
        message={message}
        isMerging={this.props.isMerging}
        isAmending={this.props.isAmending}
        isCommitting={operationStates.isCommitInProgress()}
        lastCommit={this.props.lastCommit}
        currentBranch={this.props.currentBranch}
        onChangeMessage={this.handleMessageChange}
        toggleExpandedCommitMessageEditor={this.toggleExpandedCommitMessageEditor}
        deactivateCommitBox={!!this.getCommitMessageEditors().length > 0}
      />
    );
  }

  componentWillReceiveProps(nextProps) {
    const switchToAmending = !this.props.isAmending && nextProps.isAmending;
    if (switchToAmending && !this.getAmendingCommitMessage() && nextProps.lastCommit.isPresent()) {
      this.setAmendingCommitMessage(nextProps.lastCommit.getMessage());
    } else if (!this.props.isMerging && nextProps.isMerging && !this.getRegularCommitMessage()) {
      this.setRegularCommitMessage(nextProps.mergeMessage || '');
    }
  }

  componentWillUnmount() {
    this.subscriptions.dispose();
  }

  @autobind
  setAmending(amending) {
    const changed = this.props.repository.isAmending() !== amending;
    this.props.repository.setAmending(amending);
    if (changed) {
      this.forceUpdate();
    }
  }

  @autobind
  async commit(message) {
    if (this.getCommitMessageEditors().length > 0) {
      await this.props.commit({filePath: this.getCommitMessagePath()});
    } else {
      let formattedMessage = message;
      if (this.props.config.get('github.automaticCommitMessageWrapping')) {
        formattedMessage = wrapCommitMessage(formattedMessage);
      }
      await this.props.commit(formattedMessage);
    }
  }

  getCommitMessage() {
    const message = this.props.isAmending ? this.getAmendingCommitMessage() : this.getRegularCommitMessage();
    return message || '';
  }

  setAmendingCommitMessage(message) {
    if (!this.props.repository.isPresent()) { return; }
    const changed = this.props.repository.getAmendingCommitMessage() !== message;
    this.props.repository.setAmendingCommitMessage(message);
    if (changed) { this.forceUpdate(); }
  }

  getAmendingCommitMessage() {
    return this.props.repository.getAmendingCommitMessage();
  }

  setRegularCommitMessage(message) {
    if (!this.props.repository.isPresent()) { return; }
    const changed = this.props.repository.getRegularCommitMessage() !== message;
    this.props.repository.setRegularCommitMessage(message);
    if (changed) { this.forceUpdate(); }
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
  }

  getCommitMessageEditors() {
    if (!this.props.repository.isPresent()) {
      return [];
    }
    return this.props.workspace.getTextEditors().filter(editor => editor.getPath() === this.getCommitMessagePath());
  }

  @autobind
  async toggleExpandedCommitMessageEditor(messageFromBox) {
    if (this.getCommitMessageEditors().length > 0) {
      if (this.commitMessageEditorIsInForeground()) {
        this.closeAllOpenCommitMessageEditors();
      } else {
        this.activateCommitMessageEditor();
      }
    } else {
      await this.openCommitMessageEditor(messageFromBox);
      this.forceUpdate();
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
}

function wrapCommitMessage(message) {
  // hard wrap message (except for first line) at 72 characters
  let results = [];
  message.split('\n').forEach((line, index) => {
    if (line.length <= 72 || index === 0) {
      results.push(line);
    } else {
      const matches = line.match(/.{1,72}(\s|$)|\S+?(\s|$)/g)
        .map(match => {
          return match.endsWith('\n') ? match.substr(0, match.length - 1) : match;
        });
      results = results.concat(matches);
    }
  });

  return results.join('\n');
}
