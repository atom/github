/** @jsx etch.dom */
/* eslint react/no-unknown-property: "off" */

import etch from 'etch';
import {CompositeDisposable} from 'atom';
import ModelObserver from '../models/model-observer';
import BranchView from '../views/branch-view';
import BranchMenuView from '../views/branch-menu-view';
import PushPullView from '../views/push-pull-view';
import PushPullMenuView from '../views/push-pull-menu-view';
import ChangedFilesCountView from '../views/changed-files-count-view';
import {autobind} from 'core-decorators';

export default class StatusBarTileController {
  constructor(props) {
    this.props = props;
    this.inProgress = false;
    this.branchMenuView = null;
    this.pushPullMenuView = null;
    this.branchTooltipDisposable = null;
    this.pushPullTooltipDisposable = null;
    this.repositoryObserver = new ModelObserver({
      fetchData: this.fetchRepositoryData,
      didUpdate: () => {
        // Since changing repositories causes the destruction of the DOM
        // elements that the tooltips are bound to, we get rid of the old
        // disposables & create new tooltips when the disposables are nulled out
        this.branchTooltipDisposable && this.branchTooltipDisposable.dispose();
        this.pushPullTooltipDisposable && this.pushPullTooltipDisposable.dispose();
        this.branchTooltipDisposable = null;
        this.pushPullTooltipDisposable = null;
        return etch.update(this);
      },
    });
    this.repositoryObserver.setActiveModel(props.repository);

    this.subs = new CompositeDisposable(
      this.props.commandRegistry.add('atom-workspace', {
        'github:fetch': () => this.fetch(),
        'github:pull': () => this.pull(),
        'github:push': () => {
          const {remoteName} = this.repositoryObserver.getActiveModelData();
          this.push({force: false, setUpstream: !remoteName});
        },
        'github:force-push': () => {
          const {remoteName} = this.repositoryObserver.getActiveModelData();
          this.push({force: true, setUpstream: !remoteName});
        },
      }),
    );

    etch.initialize(this);
  }

  async update(props) {
    this.props = {...this.props, ...props};
    await this.repositoryObserver.setActiveModel(props.repository);
    return etch.update(this);
  }

  render() {
    const modelData = this.repositoryObserver.getActiveModelData();

    if (modelData) {
      return (
        <div className="github-StatusBarTileController">
          <BranchView
            ref="branchView"
            {...modelData}
            workspace={this.props.workspace}
            checkout={this.checkout}
          />
          <PushPullView
            ref="pushPullView"
            {...modelData}
            pushInProgress={this.pushInProgress}
            pullInProgress={this.pullInProgress}
          />
          <ChangedFilesCountView
            ref="changedFilesCountView"
            {...modelData}
            didClick={this.props.toggleGitPanel}
          />
          <a style="margin: 0 5px;" onclick={this.handleOpenGitTimingsView}>
            ⏰
          </a>
        </div>
      );
    } else {
      return <div />;
    }
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

  getActiveRepository() {
    return this.repositoryObserver.getActiveModel();
  }

  @autobind
  async fetchRepositoryData(repository) {
    const branchName = await repository.getCurrentBranch();
    const remoteName = await repository.getRemoteForBranch(branchName);
    const changedFilesCount = await this.fetchChangedFilesCount(repository);
    const data = {
      branchName,
      changedFilesCount,
      branches: await repository.getBranches(),
      remoteName,
      aheadCount: await repository.getAheadCount(branchName),
      behindCount: await repository.getBehindCount(branchName),
    };
    return data;
  }

  async fetchChangedFilesCount(repository) {
    const changedFiles = new Set();
    const {stagedFiles, unstagedFiles, mergeConflictFiles} = await repository.getStatusesForChangedFiles();

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

  getLastModelDataRefreshPromise() {
    return this.repositoryObserver.getLastModelDataRefreshPromise();
  }

  async setInProgressWhile(block, {push, pull, fetch} = {}) {
    if (this.inProgress) {
      return;
    }

    this.inProgress = true;
    if (push) {
      this.pushInProgress = true;
    } else if (pull || fetch) {
      this.pullInProgress = true;
    }
    etch.update(this);
    try {
      await block();
    } finally {
      this.inProgress = false;
      this.pushInProgress = false;
      this.pullInProgress = false;
      await etch.update(this);
    }
  }

  @autobind
  checkout(branchName, options) {
    return this.setInProgressWhile(() => this.getActiveRepository().checkout(branchName, options));
  }

  @autobind
  async push(options) {
    const {branchName} = this.repositoryObserver.getActiveModelData();

    await this.setInProgressWhile(() => this.getActiveRepository().push(branchName, options), {push: true});
  }

  @autobind
  async pull() {
    const {branchName} = this.repositoryObserver.getActiveModelData();
    await this.setInProgressWhile(() => this.getActiveRepository().pull(branchName), {pull: true});
  }

  @autobind
  async fetch() {
    const {branchName} = this.repositoryObserver.getActiveModelData();
    await this.setInProgressWhile(() => this.getActiveRepository().fetch(branchName), {fetch: true});
  }

  destroy(removeDomNode) {
    this.subs.dispose();
    this.branchTooltipDisposable && this.branchTooltipDisposable.dispose();
    this.pushPullTooltipDisposable && this.pushPullTooltipDisposable.dispose();
    this.repositoryObserver.destroy();
    etch.destroy(this, removeDomNode);
  }
}
