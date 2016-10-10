/** @babel */
/** @jsx etch.dom */

import etch from 'etch'
import Tether from 'tether'
import ModelObserver from '../models/model-observer'
import BranchView from '../views/branch-view'
import BranchMenuView from '../views/branch-menu-view'
import PushPullView from '../views/push-pull-view'
import PushPullMenuView from '../views/push-pull-menu-view'
import ChangedFilesCountView from '../views/changed-files-count-view'

export default class StatusBarTileController {
  constructor (props) {
    this.props = props
    this.checkout = this.checkout.bind(this)
    this.push = this.push.bind(this)
    this.pull = this.pull.bind(this)
    this.fetch = this.fetch.bind(this)
    this.toggleBranchMenu = this.toggleBranchMenu.bind(this)
    this.togglePushPullMenu = this.togglePushPullMenu.bind(this)
    this.branchMenuView = null
    this.pushPullMenuView = null
    this.showingBranchMenuView = false
    this.showingPushPllMenuView = false
    this.repositoryObserver = new ModelObserver({
      fetchData: this.fetchRepositoryData.bind(this),
      didUpdate: () => etch.update(this)
    })
    this.repositoryObserver.setActiveModel(props.repository)
    etch.initialize(this)
  }

  update (props) {
    this.props = Object.assign({}, this.props, props)
    this.repositoryObserver.setActiveModel(props.repository)
    return etch.update(this)
  }

  render () {
    const modelData = this.repositoryObserver.getActiveModelData()

    const pushPullView = (
      <PushPullView
        ref='pushPullView'
        {...modelData}
        didClick={this.togglePushPullMenu}
      />
    )

    if (modelData) {
      return (
        <div className='git-StatusBarTileController'>
          { modelData.remoteName ? pushPullView : <noscript /> }
          <BranchView
            ref="branchView"
            {...modelData}
            workspace={this.props.workspace}
            checkout={this.checkout}
            didClick={this.toggleBranchMenu} />
          <ChangedFilesCountView
            ref="changedFilesCountView"
            {...modelData}
            didClick={this.props.toggleGitPanel} />
        </div>
      )
    } else {
      return <div />
    }
  }

  writeAfterUpdate () {
    const modelData = this.repositoryObserver.getActiveModelData()
    if (modelData) {
      if (this.branchMenuView) {
        this.branchMenuView.update(modelData)
      } else {
        this.branchMenuView = new BranchMenuView({
          ...modelData,
          workspace: this.props.workspace,
          checkout: this.checkout
        })
      }

      if (this.pushPullMenuView) {
        this.pushPullMenuView.update(modelData)
      } else {
        this.pushPullMenuView = new PushPullMenuView({
          ...modelData,
          workspace: this.props.workspace,
          push: this.push,
          pull: this.pull,
          fetch: this.fetch
        })
      }
    }
  }

  getActiveRepository () {
    return this.repositoryObserver.getActiveModel()
  }

  async fetchRepositoryData (repository) {
    const branchName = await repository.getCurrentBranch()
    const remoteName = await repository.getRemote(branchName)
    const changedFilesCount = await this.fetchChangedFilesCount(repository)
    const data = {
      branchName,
      remoteName,
      changedFilesCount,
      branches: await repository.getBranches()
    }
    if (remoteName) {
      data.aheadCount = await repository.getAheadCount(branchName),
      data.behindCount = await repository.getBehindCount(branchName),
      data.pullDisabled = changedFilesCount > 0
    }
    return data
  }

  async fetchChangedFilesCount (repository) {
    const changedFiles = new Set()
    for (let filePatch of await repository.getUnstagedChanges()) {
      changedFiles.add(filePatch.getPath())
    }
    for (let filePatch of await repository.getStagedChanges()) {
      changedFiles.add(filePatch.getPath())
    }
    return changedFiles.size
  }

  getLastModelDataRefreshPromise () {
    return this.repositoryObserver.getLastModelDataRefreshPromise()
  }

  checkout (branchName, options) {
    return this.getActiveRepository().checkout(branchName, options)
  }

  push () {
    return this.getActiveRepository().push(this.branchName)
  }

  pull () {
    const {pullDisabled} = this.repositoryObserver.getActiveModelData()
    return pullDisabled ? Promise.resolve() : this.getActiveRepository().pull(this.branchName)
  }

  fetch () {
    return this.getActiveRepository().fetch(this.branchName)
  }

  toggleBranchMenu (event) {
    event && event.stopPropagation()

    if (this.branchMenuView) {
      if (this.showingBranchMenuView) {
        this.hideBranchMenu()
      } else {
        this.showBranchMenu()
      }
    }
  }

  hideBranchMenu () {
    this.tooltipDisposable.dispose()
    this.showingBranchMenuView = false
  }

  showBranchMenu () {
    const menuElement = this.branchMenuView.element
    this.tooltipDisposable =
      atom.tooltips.add(this.refs.branchView.element, {
        tooltipElement: menuElement,
        tooltipClass: 'git-StatusBarTileController-tooltipMenu',
        trigger: 'manual',
        delay: { show: 0, hide: 100 },
      })

    const hideBranchMenu = (event) => {
      if (event.target !== menuElement && !menuElement.contains(event.target)) {
        window.removeEventListener('click', hideBranchMenu, true)
        this.hideBranchMenu()
      }
    }
    window.addEventListener('click', hideBranchMenu, true)
    this.showingBranchMenuView = true
  }

  togglePushPullMenu (event) {
    event && event.stopPropagation()

    if (this.pushPullMenuView) {
      if (this.showingPushPullMenuView) {
        this.hidePushPullMenu()
      } else {
        this.showPushPullMenu()
      }
    }
  }

  hidePushPullMenu () {
    this.tooltipDisposable.dispose()
    this.showingPushPullMenuView = false
  }

  showPushPullMenu () {
    const menuElement = this.pushPullMenuView.element
    this.tooltipDisposable =
      atom.tooltips.add(this.refs.pushPullView.element, {
        tooltipElement: menuElement,
        tooltipClass: 'git-StatusBarTileController-tooltipMenu',
        trigger: 'manual',
        delay: { show: 0, hide: 100 },
      })

    const hidePushPullMenu = (event) => {
      if (event.target !== menuElement && !menuElement.contains(event.target)) {
        window.removeEventListener('click', hidePushPullMenu, true)
        this.hidePushPullMenu()
      }
    }
    window.addEventListener('click', hidePushPullMenu, true)
    this.showingPushPullMenuView = true
  }

  destroy () {
    if (this.showingBranchMenuView) this.toggleBranchMenu()
    if (this.showingPushPullMenuView) this.togglePushPullMenu()
  }
}
