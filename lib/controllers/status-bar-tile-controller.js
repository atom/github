import React from 'react';
import PropTypes from 'prop-types';

import {GitError} from '../git-shell-out-strategy';
import ObserveModelDecorator from '../decorators/observe-model';
import {BranchPropType, RemotePropType} from '../prop-types';
import BranchView from '../views/branch-view';
import BranchMenuView from '../views/branch-menu-view';
import PushPullView from '../views/push-pull-view';
import PushPullMenuView from '../views/push-pull-menu-view';
import ChangedFilesCountView from '../views/changed-files-count-view';
import Tooltip from '../views/tooltip';
import Commands, {Command} from '../views/commands';
import {nullBranch} from '../models/branch';
import {nullRemote} from '../models/remote';
import yubikiri from 'yubikiri';
import {autobind} from 'core-decorators';

@ObserveModelDecorator({
  getModel: props => props.repository,
  fetchData: repository => {
    return yubikiri({
      currentBranch: repository.getCurrentBranch(),
      branches: repository.getBranches(),
      statusesForChangedFiles: repository.getStatusesForChangedFiles(),
      currentRemote: async query => repository.getRemoteForBranch((await query.currentBranch).getName()),
      aheadCount: async query => repository.getAheadCount((await query.currentBranch).getName()),
      behindCount: async query => repository.getBehindCount((await query.currentBranch).getName()),
      originExists: async () => {
        const remotes = await repository.getRemotes();
        return remotes.filter(remote => remote.getName() === 'origin').length > 0;
      },
    });
  },
})
export default class StatusBarTileController extends React.Component {
  static propTypes = {
    workspace: PropTypes.object.isRequired,
    notificationManager: PropTypes.object.isRequired,
    commandRegistry: PropTypes.object.isRequired,
    tooltips: PropTypes.object.isRequired,
    confirm: PropTypes.func.isRequired,
    repository: PropTypes.object.isRequired,
    currentBranch: BranchPropType.isRequired,
    branches: PropTypes.arrayOf(BranchPropType).isRequired,
    currentRemote: RemotePropType.isRequired,
    aheadCount: PropTypes.number,
    behindCount: PropTypes.number,
    statusesForChangedFiles: PropTypes.object,
    originExists: PropTypes.bool,
    toggleGitTab: PropTypes.func,
    ensureGitTabVisible: PropTypes.func,
  }

  static defaultProps = {
    currentBranch: nullBranch,
    branches: [],
    currentRemote: nullRemote,
    toggleGitTab: () => {},
  }

  constructor(props, context) {
    super(props, context);

    this.state = {
      inProgress: false,
      pushInProgress: false,
      fetchInProgress: false,
    };
  }

  getChangedFilesCount() {
    const {stagedFiles, unstagedFiles, mergeConflictFiles} = this.props.statusesForChangedFiles;
    const changedFiles = new Set();

    for (const filePath in unstagedFiles) {
      changedFiles.add(filePath);
    }
    for (const filePath in stagedFiles) {
      changedFiles.add(filePath);
    }
    for (const filePath in mergeConflictFiles) {
      changedFiles.add(filePath);
    }

    return changedFiles.size;
  }

  render() {
    let changedFilesCount, mergeConflictsPresent;
    if (this.props.statusesForChangedFiles) {
      changedFilesCount = this.getChangedFilesCount();
      mergeConflictsPresent = Object.keys(this.props.statusesForChangedFiles.mergeConflictFiles).length > 0;
    }

    const repoProps = {
      repository: this.props.repository,
      currentBranch: this.props.currentBranch,
      branches: this.props.branches,
      currentRemote: this.props.currentRemote,
      aheadCount: this.props.aheadCount,
      behindCount: this.props.behindCount,
      changedFilesCount,
      mergeConflictsPresent,
    };

    return (
      <div className="github-StatusBarTileController">
        {this.renderTiles(repoProps)}
        <ChangedFilesCountView
          didClick={this.props.toggleGitTab}
          {...repoProps}
        />
      </div>
    );
  }

  renderTiles(repoProps) {
    if (!this.props.repository.showStatusBarTiles()) {
      return null;
    }

    return (
      <span>
        <Commands registry={this.props.commandRegistry} target="atom-workspace">
          <Command command="github:fetch" callback={this.fetch} />
          <Command command="github:pull" callback={this.pull} />
          <Command
            command="github:push"
            callback={() => this.push({force: false, setUpstream: !this.props.currentRemote.isPresent()})}
          />
          <Command
            command="github:force-push"
            callback={() => this.push({force: true, setUpstream: !this.props.currentRemote.isPresent()})}
          />
        </Commands>
        <BranchView
          ref={e => { this.branchView = e; }}
          workspace={this.props.workspace}
          checkout={this.checkout}
          {...repoProps}
        />
        <Tooltip
          manager={this.props.tooltips}
          target={() => this.branchView}
          trigger="click"
          className="github-StatusBarTileController-tooltipMenu">
          <BranchMenuView
            workspace={this.props.workspace}
            notificationManager={this.props.notificationManager}
            commandRegistry={this.props.commandRegistry}
            checkout={this.checkout}
            {...repoProps}
          />
        </Tooltip>
        <PushPullView
          ref={e => { this.pushPullView = e; }}
          pushInProgress={this.state.pushInProgress}
          fetchInProgress={this.state.fetchInProgress}
          {...repoProps}
        />
        <Tooltip
          manager={this.props.tooltips}
          target={() => this.pushPullView}
          trigger="click"
          className="github-StatusBarTileController-tooltipMenu">
          <PushPullMenuView
            onMarkSpecialClick={this.handleOpenGitTimingsView}
            workspace={this.props.workspace}
            inProgress={this.state.inProgress}
            originExists={!!this.props.originExists}
            push={this.push}
            pull={this.pull}
            fetch={this.fetch}
            {...repoProps}
          />
        </Tooltip>
      </span>
    );
  }

  @autobind
  handleOpenGitTimingsView(e) {
    e && e.preventDefault();
    this.props.workspace.open('atom-github://debug/timings');
  }

  setInProgressWhile(block, {push, pull, fetch} = {push: false, pull: false, fetch: false}) {
    return new Promise((resolve, reject) => {
      if (this.state.inProgress) {
        resolve();
        return;
      }

      this.setState({inProgress: true, pushInProgress: push, fetchInProgress: pull || fetch}, async () => {
        try {
          await block();
        } catch (e) {
          reject(e);
        } finally {
          this.setState({inProgress: false, pushInProgress: false, fetchInProgress: false}, resolve);
        }
      });
    });
  }

  async attemptGitOperation(operation, errorTransform = error => ({message: error.stdErr})) {
    const operationPromise = operation();
    try {
      return await operationPromise;
    } catch (error) {
      if (!(error instanceof GitError)) { throw error; }

      const {notificationMethod = 'addError', message, description} = errorTransform(error);
      this.props.notificationManager[notificationMethod](
        message || 'Cannot complete remote interaction',
        {description, dismissable: true},
      );
      return null;
    }
  }

  @autobind
  checkout(branchName, options) {
    return this.setInProgressWhile(() => this.props.repository.checkout(branchName, options));
  }

  @autobind
  async push({force, setUpstream}) {
    await this.attemptGitOperation(
      () => this.doPush({force, setUpstream}),
      error => {
        if (/rejected[\s\S]*failed to push/.test(error.stdErr)) {
          return {
            message: 'Push rejected',
            description: 'The tip of your current branch is behind its remote counterpart.' +
              ' Try pulling before pushing again. Or, to force push, hold `cmd` or `ctrl` while clicking.',
          };
        }

        return {message: 'Unable to push', description: `<pre>${error.stdErr}</pre>`};
      },
    );
  }

  async doPush(options) {
    if (options.force) {
      const choice = this.props.confirm({
        message: 'Are you sure you want to force push?',
        detailedMessage: 'This operation could result in losing data on the remote.',
        buttons: ['Force Push', 'Cancel Push'],
      });
      if (choice !== 0) { return; }
    }

    await this.setInProgressWhile(() => {
      return this.props.repository.push(this.props.currentBranch.getName(), options);
    }, {push: true});
  }

  @autobind
  async pull() {
    await this.attemptGitOperation(
      () => this.doPull(),
      error => {
        if (/error: Your local changes to the following files would be overwritten by merge/.test(error.stdErr)) {
          const lines = error.stdErr.split('\n');
          const files = lines.slice(3, lines.length - 3).map(l => `\`${l.trim()}\``).join('<br>');
          return {
            message: 'Pull aborted',
            description: 'Local changes to the following would be overwritten by merge:<br>' + files +
              '<br>Please commit your changes or stash them before you merge.',
          };
        } else if (/Automatic merge failed; fix conflicts and then commit the result./.test(error.stdOut)) {
          this.props.ensureGitTabVisible();
          return {
            notificationMethod: 'addWarning',
            message: 'Merge conflicts',
            description: `Your local changes conflicted with changes made on the remote branch. Resolve the conflicts
              with the Git panel and commit to continue.`,
          };
        }

        return {message: 'Unable to pull', description: `<pre>${error.stdErr}</pre>`};
      },
    );

  }

  async doPull() {
    await this.setInProgressWhile(() => this.props.repository.pull(this.props.currentBranch.getName()), {pull: true});
  }

  @autobind
  async fetch() {
    await this.attemptGitOperation(
      () => this.doFetch(),
      error => {
        return {
          message: 'Unable to fetch',
          description: `<pre>${error.stdErr}</pre>`,
        };
      },
    );
  }

  async doFetch() {
    await this.setInProgressWhile(() => this.props.repository.fetch(this.props.currentBranch.getName()), {fetch: true});
  }
}
