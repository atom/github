/** @babel */
/** @jsx etch.dom */

import etch from 'etch'
import Tether from 'tether'
import ModelObserver from '../models/model-observer'
import BranchView from '../views/branch-view'
import BranchMenuView from '../views/branch-menu-view'
import ChangedFilesCountView from '../views/changed-files-count-view'

export default class StatusBarTileController {
  constructor (props) {
    this.props = props
    this.checkout = this.checkout.bind(this)
    this.toggleBranchMenu = this.toggleBranchMenu.bind(this)
    this.branchMenuView = null
    this.showingBranchMenuView = false
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
    if (modelData) {
      return (
        <div className='git-StatusBarTileController'>
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
    }
  }

  getActiveRepository () {
    return this.repositoryObserver.getActiveModel()
  }

  async fetchRepositoryData (repository) {
    return {
      branchName: await repository.getCurrentBranch(),
      branches: await repository.getBranches(),
      changedFilesCount: await this.fetchChangedFilesCount(repository)
    }
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
    return this.repositoryObserver.getActiveModel().checkout(branchName, options)
  }

  toggleBranchMenu (event) {
    event.stopPropagation()

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

  destroy () {
    if (this.showingBranchMenuView) this.toggleBranchMenu()
  }
}
