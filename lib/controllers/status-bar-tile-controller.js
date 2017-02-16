import React from 'react';

import {CompositeDisposable} from 'atom';
import EtchWrapper from '../views/etch-wrapper';
import ObserveModel from '../decorators/observe-model';
import BranchView from '../views/branch-view';
import BranchMenuView from '../views/branch-menu-view';
import PushPullView from '../views/push-pull-view';
import PushPullMenuView from '../views/push-pull-menu-view';
import ChangedFilesCountView from '../views/changed-files-count-view';
import {autobind} from 'core-decorators';

@ObserveModel({
  getModel: props => props.repository,
  fetchData: async repository => {
    const promises = {
      branchName: repository.getCurrentBranch(),
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

    const branchName = await promises.branchName;
    const branchPromises = {
      remoteName: repository.getRemoteForBranch(branchName),
      aheadCount: repository.getAheadCount(branchName),
      behindCount: repository.getBehindCount(branchName),
    };

    return {
      branchName,
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
    commandRegistry: React.PropTypes.object.isRequired,
    repository: React.PropTypes.object,
    branchName: React.PropTypes.string,
    branches: React.PropTypes.arrayOf(React.PropTypes.string),
    remoteName: React.PropTypes.string,
    aheadCount: React.PropTypes.number,
    behindCount: React.PropTypes.number,
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

    this.branchMenuView = null;
    this.pushPullMenuView = null;
    this.branchTooltipDisposable = null;
    this.pushPullTooltipDisposable = null;

    this.subs = new CompositeDisposable(
      this.props.commandRegistry.add('atom-workspace', {
        'github:fetch': () => this.fetch(),
        'github:pull': () => this.pull(),
        'github:push': () => this.push({force: false, setUpstream: !this.props.remoteName}),
        'github:force-push': () => this.push({force: true, setUpstream: !this.props.remoteName}),
      }),
    );
  }

  render() {
    const repoProps = {
      branchName: this.props.branchName,
      branches: this.props.branches,
      remoteName: this.props.remoteName,
      aheadCount: this.props.aheadCount,
      behindCount: this.props.behindCount,
      pullDisabled: this.props.pullDisabled,
    };

    return (
      <div className="github-StatusBarTileController">
        <EtchWrapper>
          <BranchView
            ref="branchView"
            {...repoProps}
            workspace={this.props.workspace}
            checkout={this.checkout}
          />
        </EtchWrapper>
        <EtchWrapper>
          <PushPullView
            ref="pushPullView"
            {...repoProps}
            pushInProgress={this.state.pushInProgress}
            fetchInProgress={this.state.fetchInProgress}
          />
        </EtchWrapper>
        <EtchWrapper>
          <ChangedFilesCountView
            ref="changedFilesCountView"
            {...repoProps}
            didClick={this.props.toggleGitPanel}
          />
        </EtchWrapper>
        <a style="margin: 0 5px;" onClick={this.handleOpenGitTimingsView}>
          ⏰
        </a>
      </div>
    );
  }

  componentWillUnmount() {
    this.branchTooltipDisposable && this.branchTooltipDisposable.dispose();
    this.pushPullTooltipDisposable && this.pushPullTooltipDisposable.dispose();
    this.branchTooltipDisposable = null;
    this.pushPullTooltipDisposable = null;

    this.subs.dispose();
  }

  @autobind
  handleOpenGitTimingsView(e) {
    e.preventDefault();
    this.props.workspace.open('atom-github://debug/timings');
  }

  writeAfterUpdate() {
    const modelData = this.repositoryObserver.getActiveModelData();
    if (modelData) {
      if (this.refs.pushPullView) { this.createOrUpdatePushPullMenu(modelData); }
      this.createOrUpdateBranchMenu(modelData);
    }
  }

  createOrUpdatePushPullMenu(modelData) {
    if (this.pushPullMenuView) {
      this.pushPullMenuView.update({...modelData, inProgress: this.inProgress});
    } else {
      this.pushPullMenuView = new PushPullMenuView({
        ...modelData,
        workspace: this.props.workspace,
        notificationManager: this.props.notificationManager,
        inProgress: this.inProgress,
        push: this.push,
        pull: this.pull,
        fetch: this.fetch,
      });
    }

    if (!this.pushPullTooltipDisposable) {
      this.pushPullTooltipDisposable = atom.tooltips.add(this.refs.pushPullView.element, {
        item: this.pushPullMenuView,
        class: 'github-StatusBarTileController-tooltipMenu',
        trigger: 'click',
      });
    }
  }

  createOrUpdateBranchMenu(modelData) {
    if (this.branchMenuView) {
      this.branchMenuView.update(modelData);
    } else {
      this.branchMenuView = new BranchMenuView({
        ...modelData,
        workspace: this.props.workspace,
        notificationManager: this.props.notificationManager,
        checkout: this.checkout,
      });
    }

    if (!this.branchTooltipDisposable) {
      this.branchTooltipDisposable = atom.tooltips.add(this.refs.branchView.element, {
        item: this.branchMenuView,
        class: 'github-StatusBarTileController-tooltipMenu',
        trigger: 'click',
      });
    }
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
    await this.setInProgressWhile(() => this.props.repository.push(this.props.branchName, options), {push: true});
  }

  @autobind
  async pull() {
    if (this.props.pullDisabled) {
      return;
    }

    await this.setInProgressWhile(() => this.props.repository.pull(this.props.branchName), {pull: true});
  }

  @autobind
  async fetch() {
    await this.setInProgressWhile(() => this.props.repository.fetch(this.props.branchName), {fetch: true});
  }
}
