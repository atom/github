/** @jsx etch.dom */
/* eslint react/no-unknown-property: "off" */
import {CompositeDisposable} from 'atom';

import etch from 'etch';
import {autobind} from 'core-decorators';

import {GitError} from '../git-shell-out-strategy';

export default class BranchMenuView {
  constructor(props) {
    this.props = props;
    const TextEditor = props.workspace.buildTextEditor;
    this.textEditorWidget = (
      <TextEditor
        ref="editor"
        mini={true}
        softWrapped={true}
        placeholderText="enter new branch name"
        lineNumberGutterVisible={false}
        showInvisibles={false}
        scrollPastEnd={false}
      />
    );
    this.createNew = false;
    etch.initialize(this);
    this.subscriptions = new CompositeDisposable(
      atom.commands.add('.github-BranchMenuView-editor atom-text-editor[mini]', {
        'tool-panel:unfocus': this.cancelCreateNewBranch,
        'core:cancel': this.cancelCreateNewBranch,
        'core:confirm': this.createBranch,
      }),
    );
  }

  update(props) {
    this.props = {...this.props, ...props};
    this.createNew = false;
    return etch.update(this);
  }

  @autobind
  async didSelectItem() {
    const branchName = this.refs.list.selectedOptions[0].text;
    try {
      await this.props.checkout(branchName);
    } catch (e) {
      if (!(e instanceof GitError)) { throw e; }
      if (e.stdErr.match(/local changes.*would be overwritten/)) {
        const files = e.stdErr.split(/\r?\n/).filter(l => l.startsWith('\t')).map(l => `\`${l.trim()}\``).join('<br>');
        this.props.notificationManager.addError(
          'Checkout aborted',
          {
            description: 'Local changes to the following would be overwritten:<br>' + files +
              '<br>Please commit your changes or stash them.',
            dismissable: true,
          },
        );
        this.refs.list.selectedIndex = this.props.branches.indexOf(this.props.branchName);
      } else {
        this.props.notificationManager.addError('Checkout aborted', {description: e.stdErr, dismissable: true});
      }
      return etch.update(this);
    }
    return null;
  }

  @autobind
  async createBranch() {
    if (this.createNew) {
      const branchName = this.refs.editor.getText().trim();
      try {
        await this.props.checkout(branchName, {createNew: true});
        return null;
      } catch (e) {
        if (!(e instanceof GitError)) { throw e; }
        if (e.stdErr.match(/branch.*already exists/)) {
          this.props.notificationManager.addError(
            'Cannot create branch',
            {
              description: `\`${branchName}\` already exists. Choose another branch name.`,
            },
          );
        } else if (e.stdErr.match(/error: you need to resolve your current index first/)) {
          this.props.notificationManager.addError(
            'Cannot create branch',
            {
              description: 'You must first resolve merge conflicts.',
            },
          );
        } else {
          this.props.notificationManager.addError('Cannot create branch', {description: e.stdErr, dismissable: true});
        }
        this.createNew = false;
        return etch.update(this);
      }
    } else {
      this.createNew = true;
      return etch.update(this).then(() => {
        this.refs.editor.element.focus();
      });
    }
  }

  @autobind
  cancelCreateNewBranch() {
    this.createNew = false;
    etch.update(this);
  }

  render() {
    const newBranchEditor = (
      <div className="github-BranchMenuView-item github-BranchMenuView-editor">
        {this.textEditorWidget}
      </div>
    );

    const selectBranchView = (
      <select
        ref="list"
        className="github-BranchMenuView-item github-BranchMenuView-select input-select"
        onchange={this.didSelectItem}>
        {this.props.branches.map(branch => {
          return <option key={branch} value={branch} selected={branch === this.props.branchName}>{branch}</option>;
        })}
      </select>
    );

    return (
      <div className="github-BranchMenuView">
        <div className="github-BranchMenuView-selector">
          <span className="github-BranchMenuView-item icon icon-git-branch" />
          { this.createNew ? newBranchEditor : selectBranchView }
          <button ref="newBranchButton" className="github-BranchMenuView-item github-BranchMenuView-button btn"
            onclick={this.createBranch}> New Branch </button>
        </div>
      </div>
    );
  }

  destroy() {
    this.subscriptions.dispose();
    etch.destroy(this);
  }
}
