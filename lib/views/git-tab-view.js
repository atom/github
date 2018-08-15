import React from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';
import {CompositeDisposable} from 'atom';

import StagingView from './staging-view';
import GitLogo from './git-logo';
import CommitController from '../controllers/commit-controller';
import RecentCommitsController from '../controllers/recent-commits-controller';
import RefHolder from '../models/ref-holder';
import {isValidWorkdir, autobind} from '../helpers';
import {AuthorPropType, UserStorePropType, RefHolderPropType} from '../prop-types';

export default class GitTabView extends React.Component {
  static focus = {
    ...StagingView.focus,
    ...CommitController.focus,
    ...RecentCommitsController.focus,
  };

  static propTypes = {
    refRoot: RefHolderPropType,
    refStagingView: RefHolderPropType,

    repository: PropTypes.object.isRequired,
    isLoading: PropTypes.bool.isRequired,

    lastCommit: PropTypes.object.isRequired,
    currentBranch: PropTypes.object,
    recentCommits: PropTypes.arrayOf(PropTypes.object).isRequired,
    isMerging: PropTypes.bool,
    isRebasing: PropTypes.bool,
    hasUndoHistory: PropTypes.bool,
    unstagedChanges: PropTypes.arrayOf(PropTypes.object),
    stagedChanges: PropTypes.arrayOf(PropTypes.object),
    mergeConflicts: PropTypes.arrayOf(PropTypes.object),
    workingDirectoryPath: PropTypes.string,
    mergeMessage: PropTypes.string,
    userStore: UserStorePropType.isRequired,
    selectedCoAuthors: PropTypes.arrayOf(AuthorPropType),
    updateSelectedCoAuthors: PropTypes.func.isRequired,

    workspace: PropTypes.object.isRequired,
    commandRegistry: PropTypes.object.isRequired,
    grammars: PropTypes.object.isRequired,
    resolutionProgress: PropTypes.object.isRequired,
    notificationManager: PropTypes.object.isRequired,
    config: PropTypes.object.isRequired,
    project: PropTypes.object.isRequired,
    tooltips: PropTypes.object.isRequired,

    initializeRepo: PropTypes.func.isRequired,
    abortMerge: PropTypes.func.isRequired,
    commit: PropTypes.func.isRequired,
    undoLastCommit: PropTypes.func.isRequired,
    prepareToCommit: PropTypes.func.isRequired,
    resolveAsOurs: PropTypes.func.isRequired,
    resolveAsTheirs: PropTypes.func.isRequired,
    undoLastDiscard: PropTypes.func.isRequired,
    attemptStageAllOperation: PropTypes.func.isRequired,
    attemptFileStageOperation: PropTypes.func.isRequired,
    discardWorkDirChangesForPaths: PropTypes.func.isRequired,
    openFiles: PropTypes.func.isRequired,
  };

  constructor(props, context) {
    super(props, context);
    autobind(this, 'initializeRepo', 'blur', 'advanceFocus', 'retreatFocus', 'quietlySelectItem');

    this.subscriptions = new CompositeDisposable();

    this.refCommitController = new RefHolder();
  }

  componentDidMount() {
    this.props.refRoot.map(root => {
      return this.subscriptions.add(
        this.props.commandRegistry.add(root, {
          'tool-panel:unfocus': this.blur,
          'core:focus-next': this.advanceFocus,
          'core:focus-previous': this.retreatFocus,
        }),
      );
    });
  }

  render() {
    if (this.props.repository.isTooLarge()) {
      return (
        <div className="github-Git is-empty" tabIndex="-1" ref={this.props.refRoot.setter}>
          <div ref="noRepoMessage" className="github-Git no-repository">
            <div className="large-icon">
              <GitLogo />
            </div>
            <h3>Too many changes</h3>
            <div className="initialize-repo-description">
              The repository at <strong>{this.props.workingDirectoryPath}</strong> has too many changed files
              to display in Atom. Ensure that you have set up an appropriate <code>.gitignore</code> file.
            </div>
          </div>
        </div>
      );
    } else if (this.props.repository.hasDirectory() &&
               !isValidWorkdir(this.props.repository.getWorkingDirectoryPath())) {
      return (
        <div className="github-Git is-empty" tabIndex="-1" ref={this.props.refRoot.setter}>
          <div ref="noRepoMessage" className="github-Git no-repository">
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
      const message = this.props.repository.hasDirectory()
        ?
        (
          <span>Initialize <strong>{this.props.workingDirectoryPath}</strong> with a
          Git repository</span>
        )
        : <span>Initialize a new project directory with a Git repository</span>;

      return (
        <div className="github-Git is-empty" tabIndex="-1" ref={this.props.refRoot.setter}>
          <div ref="noRepoMessage" className="github-Git no-repository">
            <div className="large-icon">
              <GitLogo />
            </div>
            <div className="initialize-repo-description">{message}</div>
            <button onClick={this.initializeRepo} disabled={inProgress} className="btn btn-primary">
              {inProgress ? 'Creating repository...' : 'Create repository'}
            </button>
          </div>
        </div>
      );
    } else {
      const isLoading = this.props.isLoading || this.props.repository.showGitTabLoading();

      return (
        <div
          className={cx('github-Git', {'is-loading': isLoading})}
          tabIndex="-1"
          ref={this.props.refRoot.setter}>
          <StagingView
            ref={this.props.refStagingView.setter}
            commandRegistry={this.props.commandRegistry}
            notificationManager={this.props.notificationManager}
            workspace={this.props.workspace}
            stagedChanges={this.props.stagedChanges}
            unstagedChanges={this.props.unstagedChanges}
            mergeConflicts={this.props.mergeConflicts}
            workingDirectoryPath={this.props.workingDirectoryPath}
            resolutionProgress={this.props.resolutionProgress}
            openFiles={this.props.openFiles}
            discardWorkDirChangesForPaths={this.props.discardWorkDirChangesForPaths}
            attemptFileStageOperation={this.props.attemptFileStageOperation}
            attemptStageAllOperation={this.props.attemptStageAllOperation}
            undoLastDiscard={this.props.undoLastDiscard}
            abortMerge={this.props.abortMerge}
            resolveAsOurs={this.props.resolveAsOurs}
            resolveAsTheirs={this.props.resolveAsTheirs}
            lastCommit={this.props.lastCommit}
            isLoading={this.props.isLoading}
            hasUndoHistory={this.props.hasUndoHistory}
            isMerging={this.props.isMerging}
          />
          <CommitController
            ref={this.refCommitController.setter}
            tooltips={this.props.tooltips}
            config={this.props.config}
            stagedChangesExist={this.props.stagedChanges.length > 0}
            mergeConflictsExist={this.props.mergeConflicts.length > 0}
            prepareToCommit={this.props.prepareToCommit}
            commit={this.props.commit}
            abortMerge={this.props.abortMerge}
            currentBranch={this.props.currentBranch}
            workspace={this.props.workspace}
            commandRegistry={this.props.commandRegistry}
            notificationManager={this.props.notificationManager}
            grammars={this.props.grammars}
            mergeMessage={this.props.mergeMessage}
            isMerging={this.props.isMerging}
            isLoading={this.props.isLoading}
            lastCommit={this.props.lastCommit}
            repository={this.props.repository}
            userStore={this.props.userStore}
            selectedCoAuthors={this.props.selectedCoAuthors}
            updateSelectedCoAuthors={this.props.updateSelectedCoAuthors}
          />
          <RecentCommitsController
            commits={this.props.recentCommits}
            isLoading={this.props.isLoading}
            undoLastCommit={this.props.undoLastCommit}
          />
        </div>
      );
    }
  }

  componentWillUnmount() {
    this.subscriptions.dispose();
  }

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

    currentFocus = this.props.refStagingView.map(view => view.rememberFocus(event)).getOr(null);

    if (!currentFocus) {
      currentFocus = this.refCommitController.map(controller => controller.rememberFocus(event)).getOr(null);
    }

    return currentFocus;
  }

  setFocus(focus) {
    if (this.props.refStagingView.map(view => view.setFocus(focus)).getOr(false)) {
      return true;
    }

    if (this.refCommitController.map(controller => controller.setFocus(focus)).getOr(false)) {
      return true;
    }

    return false;
  }

  blur() {
    this.props.workspace.getCenter().activate();
  }

  async advanceFocus(evt) {
    // The commit controller manages its own focus
    if (this.refCommitController.map(c => c.hasFocus()).getOr(false)) {
      return;
    }

    if (await this.props.refStagingView.map(view => view.activateNextList()).getOr(false)) {
      evt.stopPropagation();
    } else {
      if (this.refCommitController.map(c => c.setFocus(GitTabView.focus.EDITOR)).getOr(false)) {
        evt.stopPropagation();
      }
    }
  }

  async retreatFocus(evt) {
    if (this.refCommitController.map(c => c.hasFocus()).getOr(false)) {
      // if the commit editor is focused, focus the last staging view list
      if (this.refCommitController.map(c => c.hasFocusEditor()).getOr(false) &&
          await this.props.refStagingView.map(view => view.activateLastList()).getOr(null)
      ) {
        this.setFocus(GitTabView.focus.STAGING);
        evt.stopPropagation();
      }
    } else if (await this.props.refStagingView.map(c => c.activatePreviousList()).getOr(null)) {
      evt.stopPropagation();
    }
  }

  async focusAndSelectStagingItem(filePath, stagingStatus) {
    await this.quietlySelectItem(filePath, stagingStatus);
    this.setFocus(GitTabView.focus.STAGING);
  }

  quietlySelectItem(filePath, stagingStatus) {
    return this.props.refStagingView.map(view => view.quietlySelectItem(filePath, stagingStatus)).getOr(false);
  }

  hasFocus() {
    return this.props.refRoot.map(root => root.contains(document.activeElement)).getOr(false);
  }
}
