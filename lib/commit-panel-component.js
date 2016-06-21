/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

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
    return <div />
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
