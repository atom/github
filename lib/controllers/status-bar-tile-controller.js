import React from 'react';

import ObserveModel from '../decorators/observe-model';
import BranchView from '../views/branch-view';
import BranchMenuView from '../views/branch-menu-view';
import PushPullView from '../views/push-pull-view';
import PushPullMenuView from '../views/push-pull-menu-view';
import ChangedFilesCountView from '../views/changed-files-count-view';
import Tooltip from '../views/tooltip';
import Commands, {Command} from '../views/commands';
import {autobind} from 'core-decorators';

@ObserveModel({
  getModel: props => props.repository,
  fetchData: async repository => {
    const promises = {
      currentBranch: repository.getCurrentBranch(),
      branches: repository.getBranches(),
      changedFilesCount: repository.getStatusesForChangedFiles().then(statuses => {
        const {stagedFiles, unstagedFiles, mergeConflictFiles} = statuses;
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
      }),
    };

    const currentBranch = await promises.currentBranch;

    const branchPromises = {
      remoteName: repository.getRemoteForBranch(currentBranch.name),
      aheadCount: repository.getAheadCount(currentBranch.name),
      behindCount: repository.getBehindCount(currentBranch.name),
    };

    return {
      currentBranch,
      changedFilesCount: await promises.changedFilesCount,
      branches: await promises.branches,
      remoteName: await branchPromises.remoteName,
      aheadCount: await branchPromises.aheadCount,
      behindCount: await branchPromises.behindCount,
      pullDisabled: (await promises.changedFilesCount) > 0,
    };
  },
})
export default class StatusBarTileController extends React.Component {
  static propTypes = {
    workspace: React.PropTypes.object.isRequired,
    notificationManager: React.PropTypes.object.isRequired,
    commandRegistry: React.PropTypes.object.isRequired,
    tooltips: React.PropTypes.object.isRequired,
    repository: React.PropTypes.object,
    currentBranch: React.PropTypes.shape({
      name: React.PropTypes.string,
      isDetached: React.PropTypes.bool,
    }),
    branches: React.PropTypes.arrayOf(React.PropTypes.string),
    remoteName: React.PropTypes.string,
    aheadCount: React.PropTypes.number,
    behindCount: React.PropTypes.number,
    changedFilesCount: React.PropTypes.number,
    pullDisabled: React.PropTypes.bool,
    toggleGitPanel: React.PropTypes.func,
  }

  static defaultProps = {
    toggleGitPanel: () => {},
  }

  constructor(props, context) {
    super(props, context);

    this.state = {
      inProgress: false,
      pushInProgress: false,
      fetchInProgress: false,
    };
  }

  render() {
    const repoProps = {
      currentBranch: this.props.currentBranch,
      branches: this.props.branches,
      remoteName: this.props.remoteName,
      aheadCount: this.props.aheadCount,
      behindCount: this.props.behindCount,
      pullDisabled: this.props.pullDisabled,
      changedFilesCount: this.props.changedFilesCount,
    };

    if (repoProps.currentBranch === undefined) {
      return null;
    }

    return (
      <div className="github-StatusBarTileController">
        <Commands registry={this.props.commandRegistry} target="atom-workspace">
          <Command command="github:fetch" callback={this.fetch} />
          <Command command="github:pull" callback={this.pull} />
          <Command
            command="github:push"
            callback={() => this.push({force: false, setUpstream: !this.props.remoteName})}
          />
          <Command
            command="github:force-push"
            callback={() => this.push({force: true, setUpstream: !this.props.remoteName})}
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
            workspace={this.props.workspace}
            notificationManager={this.props.notificationManager}
            inProgress={this.state.inProgress}
            push={this.push}
            pull={this.pull}
            fetch={this.fetch}
            {...repoProps}
          />
        </Tooltip>
        <ChangedFilesCountView
          didClick={this.props.toggleGitPanel}
          {...repoProps}
        />
        <a style={{margin: '0 5px'}} onClick={this.handleOpenGitTimingsView}>
          ⏰
        </a>
      </div>
    );
  }

  @autobind
  handleOpenGitTimingsView(e) {
    e.preventDefault();
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

  @autobind
  checkout(branchName, options) {
    return this.setInProgressWhile(() => this.props.repository.checkout(branchName, options));
  }

  @autobind
  async push(options) {
    await this.setInProgressWhile(() => {
      return this.props.repository.push(this.props.currentBranch.name, options);
    }, {push: true});
  }

  @autobind
  async pull() {
    if (this.props.pullDisabled) {
      return;
    }

    await this.setInProgressWhile(() => this.props.repository.pull(this.props.currentBranch.name), {pull: true});
  }

  @autobind
  async fetch() {
    await this.setInProgressWhile(() => this.props.repository.fetch(this.props.currentBranch.name), {fetch: true});
  }
}
