import React from 'react';
import PropTypes from 'prop-types';
import {CompositeDisposable} from 'event-kit';
import {autobind} from 'core-decorators';
import cx from 'classnames';

import Tooltip from './tooltip';
import AtomTextEditor from './atom-text-editor';
import {shortenSha} from '../helpers';

const LINE_ENDING_REGEX = /\r?\n/;

export default class CommitView extends React.Component {
  static focus = {
    EDITOR: Symbol('commit-editor'),
    ABORT_MERGE_BUTTON: Symbol('commit-abort-merge-button'),
    AMEND_BOX: Symbol('commit-amend-box'),
    COMMIT_BUTTON: Symbol('commit-button'),
  };

  static propTypes = {
    config: PropTypes.object.isRequired,
    tooltips: PropTypes.object.isRequired,
    commandRegistry: PropTypes.object.isRequired,

    lastCommit: PropTypes.object.isRequired,
    currentBranch: PropTypes.object.isRequired,
    isAmending: PropTypes.bool.isRequired,
    isMerging: PropTypes.bool.isRequired,
    mergeConflictsExist: PropTypes.bool.isRequired,
    stagedChangesExist: PropTypes.bool.isRequired,
    isCommitting: PropTypes.bool.isRequired,
    deactivateCommitBox: PropTypes.bool.isRequired,
    maximumCharacterLimit: PropTypes.number.isRequired,
    message: PropTypes.string.isRequired,

    commit: PropTypes.func.isRequired,
    abortMerge: PropTypes.func.isRequired,
    setAmending: PropTypes.func.isRequired,
    onChangeMessage: PropTypes.func.isRequired,
    toggleExpandedCommitMessageEditor: PropTypes.func.isRequired,
  };

  constructor(props, context) {
    super(props, context);

    this.state = {showWorking: false};
    this.timeoutHandle = null;
    this.subscriptions = new CompositeDisposable();

    this.refExpandButton = null;
    this.refCommitButton = null;
    this.refAmendCheckbox = null;
    this.refHardWrapButton = null;
    this.refAbortMergeButton = null;
  }

  componentWillMount() {
    this.scheduleShowWorking(this.props);

    this.subscriptions = new CompositeDisposable(
      this.props.commandRegistry.add('atom-workspace', {
        'github:commit': this.commit,
        'github:toggle-expanded-commit-message-editor': this.toggleExpandedCommitMessageEditor,
      }),
      this.props.config.onDidChange('github.automaticCommitMessageWrapping', () => this.forceUpdate()),
    );
  }

  render() {
    let remainingCharsClassName = '';
    if (this.getRemainingCharacters() < 0) {
      remainingCharsClassName = 'is-error';
    } else if (this.getRemainingCharacters() < this.props.maximumCharacterLimit / 4) {
      remainingCharsClassName = 'is-warning';
    }

    const showAbortMergeButton = this.props.isMerging || null;
    const showAmendBox = !this.props.isMerging && this.props.lastCommit.isPresent()
      && !this.props.lastCommit.isUnbornRef();

    return (
      <div className="github-CommitView">
        <div className={cx('github-CommitView-editor', {'is-expanded': this.props.deactivateCommitBox})}>
          <AtomTextEditor
            ref={c => {
              this.editorElement = c;
              this.editor = c && c.getModel();
            }}
            softWrapped={true}
            placeholderText="Commit message"
            lineNumberGutterVisible={false}
            showInvisibles={false}
            autoHeight={false}
            scrollPastEnd={false}
            text={this.props.message}
            didChange={this.didChangeCommitMessage}
            didChangeCursorPosition={this.didMoveCursor}
          />
          <button
            ref={c => { this.refHardWrapButton = c; }}
            onClick={this.toggleHardWrap}
            className="github-CommitView-hardwrap hard-wrap-icons">
            {this.renderHardWrapIcon()}
          </button>
          <Tooltip
            manager={this.props.tooltips}
            target={() => this.refHardWrapButton}
            className="github-CommitView-hardwrap-tooltip"
            title="Toggle hard wrap on commit"
          />
          <button
            ref={c => { this.refExpandButton = c; }}
            className="github-CommitView-expandButton icon icon-screen-full"
            onClick={this.toggleExpandedCommitMessageEditor}
          />
          <Tooltip
            manager={this.props.tooltips}
            target={() => this.refExpandButton}
            className="github-CommitView-expandButton-tooltip"
            title="Expand commit message editor"
          />
        </div>
        <footer className="github-CommitView-bar">
          {showAbortMergeButton &&
            <button
              ref={c => { this.refAbortMergeButton = c; }}
              className="btn github-CommitView-button github-CommitView-abortMerge is-secondary"
              onClick={this.abortMerge}>Abort Merge</button>
          }
          {showAmendBox &&
            <label className="github-CommitView-label input-label">
              <input
                ref={c => { this.refAmendCheckbox = c; }}
                className="input-checkbox github-CommitView-amend"
                type="checkbox"
                onClick={this.handleAmendBoxClick}
                checked={this.props.isAmending}
              />
              Amend
            </label>
          }
          <button
            ref={c => { this.refCommitButton = c; }}
            className="btn github-CommitView-button github-CommitView-commit"
            onClick={this.commit}
            disabled={!this.isCommitButtonEnabled()}>{this.commitButtonText()}</button>
          <div className={`github-CommitView-remaining-characters ${remainingCharsClassName}`}>
            {this.getRemainingCharacters()}
          </div>
        </footer>
      </div>
    );
  }

  renderHardWrapIcon() {
    const singleLineMessage = this.editor && this.editor.getText().split(LINE_ENDING_REGEX).length === 1;
    const hardWrap = this.props.config.get('github.automaticCommitMessageWrapping');
    const notApplicable = this.props.deactivateCommitBox || singleLineMessage;

    /* eslint-disable max-len */
    const svgPaths = {
      hardWrapEnabled: {
        path1: 'M7.058 10.2h-.975v2.4L2 9l4.083-3.6v2.4h.97l1.202 1.203L7.058 10.2zm2.525-4.865V4.2h2.334v1.14l-1.164 1.165-1.17-1.17z', // eslint-disable-line max-len
        path2: 'M7.842 6.94l2.063 2.063-2.122 2.12.908.91 2.123-2.123 1.98 1.98.85-.848L11.58 8.98l2.12-2.123-.824-.825-2.122 2.12-2.062-2.06z', // eslint-disable-line max-len
      },
      hardWrapDisabled: {
        path1: 'M11.917 8.4c0 .99-.788 1.8-1.75 1.8H6.083v2.4L2 9l4.083-3.6v2.4h3.5V4.2h2.334v4.2z',
      },
    };
    /* eslint-enable max-line */

    if (notApplicable) {
      return null;
    }

    if (hardWrap) {
      return (
        <div className={cx('icon', 'hardwrap', 'icon-hardwrap-enabled', {hidden: notApplicable || !hardWrap})}>
          <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
            <path d={svgPaths.hardWrapDisabled.path1} fillRule="evenodd" />
          </svg>
        </div>
      );
    } else {
      return (
        <div className={cx('icon', 'no-hardwrap', 'icon-hardwrap-disabled', {hidden: notApplicable || hardWrap})}>
          <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
            <g fillRule="evenodd">
              <path d={svgPaths.hardWrapEnabled.path1} />
              <path fillRule="nonzero" d={svgPaths.hardWrapEnabled.path2} />
            </g>
          </svg>
        </div>
      );
    }
  }

  componentWillReceiveProps(nextProps) {
    this.scheduleShowWorking(nextProps);
  }

  componentWillUnmount() {
    this.subscriptions.dispose();
  }

  @autobind
  didChangeCommitMessage(editor) {
    this.props.onChangeMessage(editor.getText());
  }

  @autobind
  didMoveCursor() {
    this.forceUpdate();
  }

  @autobind
  toggleHardWrap() {
    const currentSetting = this.props.config.get('github.automaticCommitMessageWrapping');
    this.props.config.set('github.automaticCommitMessageWrapping', !currentSetting);
  }

  @autobind
  abortMerge() {
    this.props.abortMerge();
  }

  @autobind
  handleAmendBoxClick(event) {
    this.props.setAmending(this.refAmendCheckbox.checked);
  }

  @autobind
  async commit() {
    if (await this.props.prepareToCommit() && this.isCommitButtonEnabled()) {
      try {
        await this.props.commit(this.editor.getText());
      } catch (e) {
        // do nothing
      }
    } else {
      this.setFocus(CommitView.focus.EDITOR);
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
      return this.props.maximumCharacterLimit || '';
    }
  }

  // We don't want the user to see the UI flicker in the case
  // the commit takes a very small time to complete. Instead we
  // will only show the working message if we are working for longer
  // than 1 second as per https://www.nngroup.com/articles/response-times-3-important-limits/
  //
  // The closure is created to restrict variable access
  scheduleShowWorking(props) {
    if (props.isCommitting) {
      if (!this.state.showWorking && this.timeoutHandle === null) {
        this.timeoutHandle = setTimeout(() => {
          this.timeoutHandle = null;
          this.setState({showWorking: true});
        }, 1000);
      }
    } else {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
      this.setState({showWorking: false});
    }
  }

  isCommitButtonEnabled() {
    return !this.props.isCommitting &&
      this.props.stagedChangesExist &&
      !this.props.mergeConflictsExist &&
      this.props.lastCommit.isPresent() &&
      (this.props.deactivateCommitBox || (this.editor && this.editor.getText().length !== 0));
  }

  commitButtonText() {
    if (this.props.isAmending) {
      return `Amend commit (${shortenSha(this.props.lastCommit.getSha())})`;
    } else if (this.state.showWorking) {
      return 'Working...';
    } else if (this.props.currentBranch.isDetached()) {
      return 'Create detached commit';
    } else if (this.props.currentBranch.isPresent()) {
      return `Commit to ${this.props.currentBranch.getName()}`;
    } else {
      return 'Commit';
    }
  }

  @autobind
  toggleExpandedCommitMessageEditor() {
    return this.props.toggleExpandedCommitMessageEditor(this.editor && this.editor.getText());
  }

  rememberFocus(event) {
    if (this.editorElement.contains(event.target)) {
      return CommitView.focus.EDITOR;
    }

    if (this.refAbortMergeButton && this.refAbortMergeButton.contains(event.target)) {
      return CommitView.focus.ABORT_MERGE_BUTTON;
    }

    if (this.refAmendCheckbox && this.refAmendCheckbox.contains(event.target)) {
      return CommitView.focus.AMEND_BOX;
    }

    if (this.refCommitButton && this.refCommitButton.contains(event.target)) {
      return CommitView.focus.COMMIT_BUTTON;
    }

    return null;
  }

  setFocus(focus) {
    let fallback = false;

    if (focus === CommitView.focus.EDITOR) {
      this.editorElement.focus();
      return true;
    }

    if (focus === CommitView.focus.ABORT_MERGE_BUTTON) {
      if (this.refAbortMergeButton) {
        this.refAbortMergeButton.focus();
        return true;
      } else {
        fallback = true;
      }
    }

    if (focus === CommitView.focus.AMEND_BOX) {
      if (this.refAmendCheckbox) {
        this.refAmendCheckbox.focus();
        return true;
      } else {
        fallback = true;
      }
    }

    if (focus === CommitView.focus.COMMIT_BUTTON) {
      if (this.refCommitButton) {
        this.refCommitButton.focus();
        return true;
      } else {
        fallback = true;
      }
    }

    if (fallback) {
      this.editorElement.focus();
      return true;
    }

    return false;
  }
}
