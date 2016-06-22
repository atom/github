/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

import StagingComponent from './staging-component'

export default class CommitPanelComponent {
  constructor ({repository}) {
    this.repository = repository
    etch.initialize(this)
  }

  destroy () {
    this.subscription.dispose()
    return etch.destroy()
  }

  render () {
    if (this.repository == null) {
      return (
        <div className='git-CommitPanel'>
          <div className='git-CommitPanel-item no-repository'>
            In order to use git features, please open a file that belongs to a git repository.
          </div>
        </div>
      )
    } else {
      return (
        <div className='git-CommitPanel' tabIndex='-1'>
          <ChangeListsComponent />
        </div>
      )
    }
  }

  update ({repository}) {
    if (this.repository !== repository) {
      this.repository = repository
      return etch.update(this)
    } else {
      return Promise.resolve()
    }
  }
}
