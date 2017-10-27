import React from 'react';
import PropTypes from 'prop-types';

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
      operationStates: repository.getOperationStates(),
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
    operationStates: PropTypes.object,
  }

  static defaultProps = {
    currentBranch: nullBranch,
    branches: [],
    currentRemote: nullRemote,
    operationStates: {},
    toggleGitTab: () => {},
  }

  constructor(props, context) {
    super(props, context);
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

    // const operations = this.props.operations;
    // const pushInProgress = operations.getPush().inProgress();

    const {pushInProgress, pullInProgress, fetchInProgress} = this.props.operationStates;

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
          pushInProgress={pushInProgress}
          fetchInProgress={fetchInProgress || pullInProgress}
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
            inProgress={pushInProgress || fetchInProgress || pullInProgress}
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

  @autobind
  checkout(branchName, options) {
    return this.props.repository.checkout(branchName, options);
  }

  @autobind
  push({force, setUpstream}) {
    return this.props.repository.push(this.props.currentBranch.getName(), {force, setUpstream});
  }

  @autobind
  pull() {
    return this.props.repository.pull(this.props.currentBranch.getName());
  }

  @autobind
  fetch() {
    return this.props.repository.fetch(this.props.currentBranch.getName());
  }
}
