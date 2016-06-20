/** @babel */
/** @jsx etch.dom */

import etch from 'etch'
import StagingAreaComponent from './staging-area-component'

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
        <div>In order to use git features, please open a file that belongs to a git repository.</div>
      )
    } else {
      return (
        <StagingAreaComponent stagingArea={this.repository.getStagingArea()} />
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
