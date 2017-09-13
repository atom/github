/** @jsx etch.dom */
/* eslint react/no-unknown-property: "off" */

import etch from 'etch';
import {autobind} from 'core-decorators';
import cx from 'classnames';

import StagingView from './staging-view';
import GitLogo from './git-logo';
import CommitViewController from '../controllers/commit-view-controller';
import {isValidWorkdir} from '../helpers';

export default class GitTabView {
  static focus = {
    ...StagingView.focus,
    ...CommitViewController.focus,
  }

  constructor(props) {
    this.props = props;
    etch.initialize(this);

    this.subscriptions = this.props.commandRegistry.add(this.element, {
      'tool-panel:unfocus': this.blur,
      'core:focus-next': this.advanceFocus,
      'core:focus-previous': this.retreatFocus,
    });
  }

  update(props) {
    this.props = props;
    return etch.update(this);
  }

  render() {
    if (this.props.repository.isTooLarge()) {
      const workingDir = this.props.repository.getWorkingDirectoryPath();
      return (
        <div className="github-Panel is-empty" tabIndex="-1">
          <div ref="noRepoMessage" className="github-Panel no-repository">
            <div className="large-icon">
              <GitLogo />
            </div>
            <h3>Too many changes</h3>
            <div className="initialize-repo-description">
              The repository at <strong>{workingDir}</strong> has too many changed files
              to display in Atom. Ensure that you have set up an appropriate <code>.gitignore</code> file.
            </div>
          </div>
        </div>
      );
    } else if (this.props.repository.hasDirectory() &&
               !isValidWorkdir(this.props.repository.getWorkingDirectoryPath())) {
      return (
        <div className="github-Panel is-empty" tabIndex="-1">
          <div ref="noRepoMessage" className="github-Panel no-repository">
            <div className="large-icon">
              <GitLogo />
            </div>
            <h3>Unsupported directory</h3>
            <div className="initialize-repo-description">
              Atom does not support managing Git repositories in your home or root directories.
            </div>
          </div>
        </div>
      );
    } else if (this.props.repository.showGitTabInit()) {
      const inProgress = this.props.repository.showGitTabInitInProgress();
      const message = this.props.repository.hasDirectory() ?
        'Initialize this project directory with a git repository' :
        'Initialize a new project directory with a git repository';

      return (
        <div className="github-Panel is-empty" tabIndex="-1">
          <div ref="noRepoMessage" className="github-Panel no-repository">
            <div className="large-icon">
              <GitLogo />
            </div>
            <div className="initialize-repo-description">{message}</div>
            <button onclick={this.initializeRepo} disabled={inProgress} className="btn btn-primary">
              {inProgress ? 'Creating repository...' : 'Create repository'}
            </button>
          </div>
        </div>
      );
    } else {
      const isLoading = this.props.fetchInProgress || this.props.repository.showGitTabLoading();

      return (
        <div className={cx('github-Panel', {'is-loading': isLoading})} tabIndex="-1">
          <StagingView
            ref="stagingView"
            commandRegistry={this.props.commandRegistry}
            notificationManager={this.props.notificationManager}
            workspace={this.props.workspace}
            stagedChanges={this.props.stagedChanges}
            unstagedChanges={this.props.unstagedChanges}
            mergeConflicts={this.props.mergeConflicts}
            workingDirectoryPath={this.props.workingDirectoryPath}
            resolutionProgress={this.props.resolutionProgress}
            didSelectFilePath={this.props.didSelectFilePath}
            openFiles={this.props.openFiles}
            discardWorkDirChangesForPaths={this.props.discardWorkDirChangesForPaths}
            attemptFileStageOperation={this.props.attemptFileStageOperation}
            undoLastDiscard={this.props.undoLastDiscard}
            abortMerge={this.props.abortMerge}
            resolveAsOurs={this.props.resolveAsOurs}
            resolveAsTheirs={this.props.resolveAsTheirs}
            lastCommit={this.props.lastCommit}
            isLoading={this.props.isLoading}
            isAmending={this.props.isAmending}
            hasUndoHistory={this.props.hasUndoHistory}
            isMerging={this.props.isMerging}
          />
          <CommitViewController
            ref="commitViewController"
            stagedChangesExist={this.props.stagedChanges.length > 0}
            mergeConflictsExist={this.props.mergeConflicts.length > 0}
            prepareToCommit={this.props.prepareToCommit}
            commit={this.props.commit}
            amending={this.props.amending}
            setAmending={this.props.setAmending}
            abortMerge={this.props.abortMerge}
            branchName={this.props.branchName}
            workspace={this.props.workspace}
            commandRegistry={this.props.commandRegistry}
            notificationManager={this.props.notificationManager}
            grammars={this.props.grammars}
            confirm={this.props.confirm}
            mergeMessage={this.props.mergeMessage}
            isMerging={this.props.isMerging}
            isAmending={this.props.isAmending}
            isLoading={this.props.isLoading}
            lastCommit={this.props.lastCommit}
            repository={this.props.repository}
          />
        </div>
      );
    }
  }

  destroy() {
    this.subscriptions.dispose();
    return etch.destroy(this);
  }

  @autobind
  initializeRepo(event) {
    event.preventDefault();
    let initPath = null;
    const activeEditor = this.props.workspace.getActiveTextEditor();
    if (activeEditor) {
      const [projectPath] = this.props.project.relativizePath(activeEditor.getPath());
      if (projectPath) {
        initPath = projectPath;
      }
    }
    this.props.initializeRepo(initPath);
  }

  rememberFocus(event) {
    let currentFocus = null;

    if (this.refs.stagingView) {
      currentFocus = this.refs.stagingView.rememberFocus(event);
    }

    if (!currentFocus && this.refs.commitViewController) {
      currentFocus = this.refs.commitViewController.rememberFocus(event);
    }

    return currentFocus;
  }

  setFocus(focus) {
    if (this.refs.stagingView) {
      if (this.refs.stagingView.setFocus(focus)) {
        return true;
      }
    }

    if (this.refs.commitViewController) {
      if (this.refs.commitViewController.setFocus(focus)) {
        return true;
      }
    }

    return false;
  }

  @autobind
  blur() {
    this.props.workspace.getActivePane().activate();
  }

  @autobind
  advanceFocus() {
    if (!this.refs.stagingView.activateNextList()) {
      this.refs.commitViewController.setFocus(GitTabView.focus.EDITOR);
    }
  }

  @autobind
  retreatFocus() {
    const {stagingView, commitViewController} = this.refs;

    if (commitViewController.hasFocus()) {
      if (stagingView.activateLastList()) {
        this.setFocus(GitTabView.focus.STAGING);
      }
    } else {
      stagingView.activatePreviousList();
    }
  }

  async focusAndSelectStagingItem(filePath, stagingStatus) {
    await this.refs.stagingView.quietlySelectItem(filePath, stagingStatus);
    this.setFocus(GitTabView.focus.STAGING);
  }

  hasFocus() {
    return this.element.contains(document.activeElement);
  }

  @autobind
  quietlySelectItem(filePath, stagingStatus) {
    return this.refs.stagingView.quietlySelectItem(filePath, stagingStatus);
  }
}
