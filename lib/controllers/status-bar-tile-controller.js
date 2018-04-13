import React from 'react';
import PropTypes from 'prop-types';

import ObserveModelDecorator from '../decorators/observe-model';
import {BranchPropType, BranchSetPropType, RemotePropType} from '../prop-types';
import BranchView from '../views/branch-view';
import BranchMenuView from '../views/branch-menu-view';
import PushPullView from '../views/push-pull-view';
import ChangedFilesCountView from '../views/changed-files-count-view';
import Tooltip from '../views/tooltip';
import Commands, {Command} from '../views/commands';
import {nullBranch} from '../models/branch';
import BranchSet from '../models/branch-set';
import {nullRemote} from '../models/remote';
import RefHolder from '../models/ref-holder';
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
    branches: BranchSetPropType.isRequired,
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
    branches: new BranchSet(),
    currentRemote: nullRemote,
    toggleGitTab: () => {},
  }

  constructor(props) {
    super(props);

    this.refBranchView = new RefHolder();
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
      originExists: this.props.originExists,
      changedFilesCount,
      mergeConflictsPresent,
    };

    return (
      <div className="github-StatusBarTileController">
        {this.renderTiles(repoProps)}
        <ChangedFilesCountView
          didClick={this.props.toggleGitTab}
          changedFilesCount={repoProps.changedFilesCount}
          mergeConflictsPresent={repoProps.mergeConflictsPresent}
        />
      </div>
    );
  }

  renderTiles(repoProps) {
    if (!this.props.repository.showStatusBarTiles()) {
      return null;
    }

    const operationStates = this.props.repository.getOperationStates();
    const pushInProgress = operationStates.isPushInProgress();
    const pullInProgress = operationStates.isPullInProgress();
    const fetchInProgress = operationStates.isFetchInProgress();

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
          ref={this.refBranchView.setter}
          workspace={this.props.workspace}
          checkout={this.checkout}
          currentBranch={repoProps.currentBranch}
        />
        <Tooltip
          manager={this.props.tooltips}
          target={this.refBranchView}
          trigger="click"
          className="github-StatusBarTileController-tooltipMenu">
          <BranchMenuView
            workspace={this.props.workspace}
            notificationManager={this.props.notificationManager}
            commandRegistry={this.props.commandRegistry}
            checkout={this.checkout}
            branches={repoProps.branches}
            currentBranch={repoProps.currentBranch}
          />
        </Tooltip>
        <PushPullView
          isSyncing={fetchInProgress || pullInProgress || pushInProgress}
          isFetching={fetchInProgress}
          isPulling={pullInProgress}
          isPushing={pushInProgress}
          push={this.push}
          pull={this.pull}
          fetch={this.fetch}
          tooltipManager={this.props.tooltips}
          currentBranch={repoProps.currentBranch}
          currentRemote={repoProps.currentRemote}
          behindCount={repoProps.behindCount}
          aheadCount={repoProps.aheadCount}
          originExists={repoProps.originExists}
        />
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
  push({force, setUpstream} = {}) {
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
