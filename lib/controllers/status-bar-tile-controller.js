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
        'github:push': () => this.push({force: false}),
        'github:force-push': () => this.push({force: true}),
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
          />
          <ChangedFilesCountView
            ref="changedFilesCountView"
            {...modelData}
            didClick={this.props.toggleGitPanel}
          />
        </div>
      );
    } else {
      return <div />;
    }
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
      this.pushPullMenuView.update(modelData);
    } else {
      this.pushPullMenuView = new PushPullMenuView({
        ...modelData,
        workspace: this.props.workspace,
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
      pullDisabled: changedFilesCount > 0,
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

  async inProgressWhile(block) {
    if (this.inProgress) {
      return;
    }

    this.inProgress = true;
    try {
      await block();
    } finally {
      this.inProgress = false;
    }
  }

  @autobind
  checkout(branchName, options) {
    return this.inProgressWhile(() => this.getActiveRepository().checkout(branchName, options));
  }

  @autobind
  async push(options) {
    const {branchName} = this.repositoryObserver.getActiveModelData();

    await this.inProgressWhile(() => this.getActiveRepository().push(branchName, options));
  }

  @autobind
  async pull() {
    const {pullDisabled, branchName} = this.repositoryObserver.getActiveModelData();
    if (pullDisabled) {
      return;
    }

    await this.inProgressWhile(() => this.getActiveRepository().pull(branchName));
  }

  @autobind
  async fetch() {
    const {branchName} = this.repositoryObserver.getActiveModelData();

    await this.inProgressWhile(() => this.getActiveRepository().fetch(branchName));
  }

  destroy(removeDomNode) {
    this.subs.dispose();
    this.branchTooltipDisposable && this.branchTooltipDisposable.dispose();
    this.pushPullTooltipDisposable && this.pushPullTooltipDisposable.dispose();
    this.repositoryObserver.destroy();
    etch.destroy(this, removeDomNode);
  }
}
